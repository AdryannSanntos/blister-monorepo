import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
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
    appName: 'Workana AI API',
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
        logger.log(`Password reset for ${data.user.email}: ${data.url}`);
      },
    },
    emailVerification: {
      sendVerificationEmail: async (data: { user: { email: string }; url: string }) => {
        logger.log(`Verification email for ${data.user.email}: ${data.url}`);
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
