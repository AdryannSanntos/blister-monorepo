import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

const logger = new Logger('PasswordResetDelivery');

type ResetPasswordPayload = {
  user: { email: string };
  url: string;
};

let urlCaptureResolver: ((url: string) => void) | null = null;

export function beginPasswordResetUrlCapture(): Promise<string> {
  return new Promise((resolve) => {
    urlCaptureResolver = resolve;
  });
}

export async function deliverPasswordResetEmail(data: ResetPasswordPayload): Promise<void> {
  if (urlCaptureResolver) {
    const resolve = urlCaptureResolver;
    urlCaptureResolver = null;
    resolve(data.url);
  }

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
}
