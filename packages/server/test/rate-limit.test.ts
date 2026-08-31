import { describe, expect, test } from "bun:test";

import { createApp } from "../src/app.ts";
import { createIdentityStore } from "../src/identity.ts";

const json = (
  app: ReturnType<typeof createApp>,
  path: string,
  init: RequestInit = {},
) =>
  app.request(path, init).then(async (response) => ({
    status: response.status,
    body: (await response.json()) as any,
  }));

describe("rate limiting on auth endpoints", () => {
  test("bootstrap returns 429 after 5 attempts", async () => {
    const identity = createIdentityStore();
    const app = createApp(
      () => ({
        status: "ready",
        service: "local-server",
        schemaVersion: 6,
        database: "ready",
        uptimeMs: 1,
      }),
      identity,
    );
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (
        await json(app, "/auth/bootstrap", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: "secure-password" }),
        })
      ).status;
    }
    expect(last).toBe(429);
  });

  test("owner-login returns 429 after 5 attempts", async () => {
    const identity = createIdentityStore({ ownerPassword: "secret" });
    const app = createApp(
      () => ({
        status: "ready",
        service: "local-server",
        schemaVersion: 6,
        database: "ready",
        uptimeMs: 1,
      }),
      identity,
    );
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (
        await json(app, "/auth/owner-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: "wrong" }),
        })
      ).status;
    }
    expect(last).toBe(429);
  });
});
