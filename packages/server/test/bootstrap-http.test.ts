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

describe("bootstrap HTTP contract", () => {
  test("creates the first owner session and locks invitation creation afterward", async () => {
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
    expect((await json(app, "/auth/bootstrap-status")).body.required).toBe(
      true,
    );
    const bootstrapped = await json(app, "/auth/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "secure-password" }),
    });
    expect(bootstrapped.status).toBe(201);
    expect((await json(app, "/auth/bootstrap-status")).body.required).toBe(
      false,
    );
    expect(
      (
        await json(app, "/auth/bootstrap", {
          method: "POST",
          body: JSON.stringify({ password: "another-password" }),
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await json(app, "/pairing/invitations", {
          method: "POST",
          body: JSON.stringify({ origin: "http://local" }),
        })
      ).status,
    ).toBe(403);
  });
});
