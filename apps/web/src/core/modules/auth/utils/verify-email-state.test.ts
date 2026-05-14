const assert = require("node:assert/strict");

const {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} = require("./verify-email-state");

const successState = getVerifyEmailViewState(
  new URLSearchParams({ status: "success" }),
);

assert.equal(successState.kind, "success");
assert.equal(successState.title, "Email verificado com sucesso");

const errorState = getVerifyEmailViewState(
  new URLSearchParams({ error: "TOKEN_EXPIRED" }),
);

assert.equal(errorState.kind, "error");
assert.equal(errorState.title, "Link de verificação inválido ou expirado");

const pendingState = getVerifyEmailViewState(
  new URLSearchParams({ email: "user@example.com" }),
);

assert.equal(pendingState.kind, "pending");
assert.equal(pendingState.email, "user@example.com");

assert.equal(
  buildEmailVerificationCallbackURL("http://localhost:3000"),
  "http://localhost:3000/auth/verify-email?status=success",
);
