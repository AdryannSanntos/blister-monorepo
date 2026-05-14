import { createAuthClient } from "better-auth/react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const baseClient = createAuthClient({
  baseURL: apiBaseUrl,
});

type AuthResponse<T = unknown> = {
  data: T | null;
  error: { message?: string; status?: number } | null;
};

// better-auth exposes these via Proxy at runtime but the TypeScript types
// don't surface them without server-side type inference. We add typed wrappers.
const proxyClient = baseClient as unknown as Record<string, (...args: unknown[]) => Promise<AuthResponse>>;

export const authClient = Object.assign(baseClient, {
  forgetPassword: (opts: { email: string; redirectTo: string }) =>
    proxyClient.forgetPassword(opts),
  sendVerificationEmail: (opts: { email: string; callbackURL?: string }) =>
    proxyClient.sendVerificationEmail(opts),
});
