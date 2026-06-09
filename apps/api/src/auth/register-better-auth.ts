import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Resend } from 'resend';
import { bootstrapUserOnSignup } from '../company/company-bootstrap.util';
import type { PrismaService } from '../prisma/prisma.service';

const logger = new Logger('BetterAuth');
const authBasePath = '/api/auth';
type AuthInstance = ReturnType<typeof import('better-auth').betterAuth>;

// Exported so SessionService can call auth.api.getSession without re-creating the instance
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
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
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
      requireEmailVerification: true,
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
          subject: 'Reset your password — Blister',
          html: `<p>Click <a href="${data.url}">here</a> to reset your password.</p>`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async (data: { user: { email: string }; url: string }) => {
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM_EMAIL ?? 'Blister <noreply@blister.com.br>';
        if (!apiKey || apiKey === 'change-me') {
          logger.warn(`[DEV] Verify email for ${data.user.email}: ${data.url}`);
          return;
        }
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: data.user.email,
          subject: 'Confirm your email — Blister',
          html: `<p>Click <a href="${data.url}">here</a> to confirm your email.</p>`,
        });
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user: { id: string; name?: string; email: string }) => {
            try {
              await bootstrapUserOnSignup(prisma.getClient(), user);
            } catch (err) {
              logger.error('Failed to bootstrap company after signup', err);
            }
          },
        },
      },
    },
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          },
        }
      : {}),
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

    void handler(req, res).catch(next);
  });
}
