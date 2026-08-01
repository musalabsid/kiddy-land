import { describe, expect, test } from "bun:test";
import { ApiClient, ClientError, canMutate } from "../src/index.ts";

describe("shared client", () => {
  test("adds auth and parses successful JSON responses", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      expect(input).toBe("http://local.test/ready");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer secret");
      return new Response(JSON.stringify({ status: "ready" }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try { const client = new ApiClient("http://local.test", "secret"); expect(await client.get<{ status: string }>("/ready")).toEqual({ status: "ready" }); } finally { globalThis.fetch = previous; }
  });
  test("normalizes API failures and blocks unsynchronized writes", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "content-type": "application/json" } })) as typeof fetch;
    try { await expect(new ApiClient("http://local.test").get("/private")).rejects.toBeInstanceOf(ClientError); } finally { globalThis.fetch = previous; }
    expect(canMutate("connected", false)).toBe(false); expect(canMutate("connected", true)).toBe(true);
  });
});
