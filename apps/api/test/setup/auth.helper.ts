import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface AuthenticatedSession {
  cookies: string[];
  userId: string;
  companyId: string;
}

export async function loginAsDemoBusiness(
  app: INestApplication,
  email: string,
  password: string,
): Promise<AuthenticatedSession> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .send({ email, password })
    .expect(200);

  const rawCookies = response.headers['set-cookie'];
  const cookies: string[] = Array.isArray(rawCookies)
    ? rawCookies
    : rawCookies
      ? [rawCookies]
      : [];

  if (!cookies.length) {
    throw new Error('No session cookie returned from login');
  }

  const userResponse = await request(app.getHttpServer())
    .get('/api/auth/get-session')
    .set('Cookie', cookies)
    .expect(200);

  const { user } = userResponse.body as {
    user?: { id: string; companyId?: string };
  };
  if (!user?.id) {
    throw new Error('Failed to get user from session');
  }

  const companyResponse = await request(app.getHttpServer())
    .get('/api/company')
    .set('Cookie', cookies)
    .expect(200);

  const company = companyResponse.body as { id?: string };

  return {
    cookies,
    userId: user.id,
    companyId: company.id ?? '',
  };
}

export function makeAuthenticatedRequest(
  app: INestApplication,
  session: AuthenticatedSession,
) {
  return {
    get: (url: string) =>
      request(app.getHttpServer()).get(url).set('Cookie', session.cookies),

    post: (url: string) =>
      request(app.getHttpServer()).post(url).set('Cookie', session.cookies),

    patch: (url: string) =>
      request(app.getHttpServer()).patch(url).set('Cookie', session.cookies),

    delete: (url: string) =>
      request(app.getHttpServer()).delete(url).set('Cookie', session.cookies),
  };
}
