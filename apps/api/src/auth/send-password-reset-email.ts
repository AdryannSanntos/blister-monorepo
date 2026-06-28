import { beginPasswordResetUrlCapture } from './password-reset-delivery';
import { getAuthInstance } from './register-better-auth';

export type PasswordResetResult = {
  sent: boolean;
  firstAccessUrl?: string;
};

export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
  options?: { captureUrl?: boolean },
): Promise<PasswordResetResult> {
  const auth = getAuthInstance();
  if (!auth) {
    return { sent: false };
  }

  const urlCapture = options?.captureUrl ? beginPasswordResetUrlCapture() : null;

  await auth.api.requestPasswordReset({
    body: { email, redirectTo },
    headers: new Headers({ 'x-forwarded-for': '127.0.0.1' }),
  });

  const firstAccessUrl = urlCapture ? await urlCapture : undefined;
  return { sent: true, firstAccessUrl };
}
