import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { deliverPasswordResetEmail } from './password-reset-delivery';
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
        await deliverPasswordResetEmail(data);
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
