import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Resend } from 'resend';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('BetterAuth');
const authBasePath = '/api/auth';
type AuthInstance = ReturnType<typeof import('better-auth').betterAuth>;

let _authInstance: AuthInstance | null = null;

export function getAuthInstance(): AuthInstance | null {
  return _authInstance;
}

export async function registerBetterAuth(
  app: INestApplication,
  prisma: PrismaService,
): Promise<void> {
  if (!prisma.isConfigured()) {
    logger.warn('Skipping Better Auth bootstrap because DATABASE_URL is not set.');
    return;
  }

  const [{ betterAuth }, { toNodeHandler }, { prismaAdapter }] = await Promise.all([
    import('better-auth'),
    import('better-auth/node'),
    import('@better-auth/prisma-adapter'),
  ]);

  const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const trustedOrigins = [
    ...new Set(
      [baseURL, ...(process.env.CORS_ORIGIN?.split(',') ?? [])]
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  ];

  type BA = typeof import('better-auth');
  type BetterAuthOptions = Parameters<BA['betterAuth']>[0];

  const options: BetterAuthOptions = {
    appName: 'Blister API',
    baseURL,
    basePath: authBasePath,
    secret:
      process.env.BETTER_AUTH_SECRET ??
      'change-me-before-production-this-secret-must-be-overridden',
    database: prismaAdapter(prisma.getClient(), {
      provider: 'postgresql',
    }),
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async (data: { user: { email: string }; url: string }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL ?? 'Blister <noreply@blister.com.br>';
        if (!apiKey || apiKey === 'change-me') {
          logger.warn(`[DEV] Reset password for ${data.user.email}: ${data.url}`);
          return;
        }
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: data.user.email,
          subject: 'Defina sua senha — Blister',
          html: `
            <p>Você foi convidado para acessar o Blister.</p>
            <p><a href="${data.url}">Clique aqui para definir sua senha</a></p>
            <p>O link expira em 1 hora.</p>
          `,
        });
      },
    },
  };

  const auth = betterAuth(options);
  _authInstance = auth;

  const handler = toNodeHandler(auth);
  const httpAdapter = app.getHttpAdapter().getInstance();

  httpAdapter.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.url.startsWith(authBasePath)) {
      next();
      return;
    }

    // Block self-signup: only admin can create users
    const path = req.url.split('?')[0];
    if (path === `${authBasePath}/sign-up/email` && req.method === 'POST') {
      res.status(403).json({ error: 'Cadastro direto não permitido. Solicite acesso ao administrador.' });
      return;
    }

    void handler(req, res).catch(next);
  });
}
