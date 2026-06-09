const VERIFY_EMAIL_SUCCESS_PATH = "/auth/verify-email?status=success";

export type VerifyEmailViewState = {
  kind: "pending" | "success" | "error";
  email: string;
  redirect: string | null;
};

export function buildEmailVerificationCallbackURL(
  origin: string,
  redirectPath?: string | null,
  verifySuccessPath = VERIFY_EMAIL_SUCCESS_PATH,
): string {
  const base = new URL(verifySuccessPath, origin);
  if (redirectPath) base.searchParams.set("redirect", redirectPath);
  return base.toString();
}

export function getVerifyEmailViewState(
  searchParams: URLSearchParams,
): VerifyEmailViewState {
  const email = searchParams.get("email") ?? "";
  const redirect = searchParams.get("redirect");
  const error = searchParams.get("error");
  const status = searchParams.get("status");

  if (error || status === "error") {
    return { kind: "error", email, redirect };
  }

  if (status === "success") {
    return { kind: "success", email, redirect };
  }

  return { kind: "pending", email, redirect };
}
