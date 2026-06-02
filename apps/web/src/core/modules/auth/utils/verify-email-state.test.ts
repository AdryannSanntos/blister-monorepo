import { describe, expect, it } from "vitest";
import {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} from "./verify-email-state";

describe("getVerifyEmailViewState", () => {
  it("returns success state for status=success", () => {
    const state = getVerifyEmailViewState(
      new URLSearchParams({ status: "success" }),
    );
    expect(state.kind).toBe("success");
    expect(state.title).toBe("Email verificado com sucesso");
  });

  it("returns error state for an error param", () => {
    const state = getVerifyEmailViewState(
      new URLSearchParams({ error: "TOKEN_EXPIRED" }),
    );
    expect(state.kind).toBe("error");
    expect(state.title).toBe("Link de verificação inválido ou expirado");
  });

  it("returns pending state with the email when no status/error is present", () => {
    const state = getVerifyEmailViewState(
      new URLSearchParams({ email: "user@example.com" }),
    );
    expect(state.kind).toBe("pending");
    expect(state.email).toBe("user@example.com");
  });
});

describe("buildEmailVerificationCallbackURL", () => {
  it("builds the success callback URL", () => {
    expect(buildEmailVerificationCallbackURL("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/verify-email?status=success",
    );
  });
});
