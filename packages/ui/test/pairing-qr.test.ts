import { describe, expect, test } from "bun:test";

import { parsePairingQr } from "../src/lib/pairing-qr.ts";

describe("parsePairingQr", () => {
  test("extracts the token from the desktop QR JSON payload", () => {
    const payload = JSON.stringify({
      origin: "http://192.168.1.108:43117",
      token: "inv_abc123",
      kind: "private",
    });
    expect(parsePairingQr(payload)).toBe("inv_abc123");
  });

  test("falls back to the raw string for a bare token QR", () => {
    expect(parsePairingQr("  inv_bare  ")).toBe("inv_bare");
  });

  test("returns undefined for empty or token-less payloads", () => {
    expect(parsePairingQr("")).toBeUndefined();
    expect(parsePairingQr("   ")).toBeUndefined();
    expect(
      parsePairingQr(JSON.stringify({ origin: "http://x", kind: "private" })),
    ).toBeUndefined();
  });
});
