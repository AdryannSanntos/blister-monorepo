import assert from "node:assert/strict";

const { resolvePostLoginRouting } = await import("./post-login-routing.ts");

assert.deepEqual(resolvePostLoginRouting([]), {
  destination: "/workspaces/create",
  activeOrgId: null,
});

assert.deepEqual(resolvePostLoginRouting([{ id: "org-1" }]), {
  destination: "/dashboard",
  activeOrgId: "org-1",
});

assert.deepEqual(resolvePostLoginRouting([{ id: "org-1" }], "stale-org"), {
  destination: "/dashboard",
  activeOrgId: "org-1",
});

assert.deepEqual(
  resolvePostLoginRouting([{ id: "org-1" }, { id: "org-2" }]),
  {
    destination: "/workspaces",
    activeOrgId: null,
  },
);

assert.deepEqual(
  resolvePostLoginRouting([{ id: "org-1" }, { id: "org-2" }], "org-1"),
  {
    destination: "/workspaces",
    activeOrgId: null,
  },
);
