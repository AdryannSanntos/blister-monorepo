const VERIFY_EMAIL_SUCCESS_PATH = "/auth/verify-email?status=success";

export type VerifyEmailViewState =
  | {
      kind: "pending";
      title: string;
      description: string;
      email: string;
      redirect: string | null;
    }
  | {
      kind: "success";
      title: string;
      description: string;
      email: string;
      redirect: string | null;
    }
  | {
      kind: "error";
      title: string;
      description: string;
      email: string;
      redirect: string | null;
    };

export function buildEmailVerificationCallbackURL(
  origin: string,
  redirectPath?: string | null,
): string {
  const base = new URL(VERIFY_EMAIL_SUCCESS_PATH, origin);
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
    return {
      kind: "error",
      title: "Link de verificação inválido ou expirado",
      description:
        "Esse link não é mais válido. Solicite um novo email de verificação para continuar.",
      email,
      redirect,
    };
  }

  if (status === "success") {
    return {
      kind: "success",
      title: "Email verificado com sucesso",
      description: "Sua conta foi ativada. Agora você já pode entrar.",
      email,
      redirect,
    };
  }

  return {
    kind: "pending",
    title: "Verifique seu email",
    description: "Acesse o link enviado para confirmar sua conta",
    email,
    redirect,
  };
}
