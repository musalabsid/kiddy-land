import { describe, expect, test } from "bun:test";

import {
  createScanLoop,
  errorMessage,
  nativeQrSupported,
} from "../src/lib/barcode-scan.ts";

const frame = {
  readyState: 2,
  videoWidth: 640,
  videoHeight: 480,
} as unknown as HTMLVideoElement;

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("createScanLoop", () => {
  test("fires exactly one payload even when frames keep decoding", async () => {
    let calls = 0;
    const loop = createScanLoop({
      decode: async () => "value",
      onPayload: () => {
        calls += 1;
      },
      intervalMs: 10,
      getFrame: () => frame,
    });
    loop.start();
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 60));
    loop.stop();
    expect(calls).toBe(1);
  });

  test("fires once with the first decoded value; ignores are the extract layer's job", async () => {
    let calls = 0;
    const values: string[] = [];
    const loop = createScanLoop({
      decode: async () => "raw-1",
      onPayload: (value) => {
        calls += 1;
        values.push(value);
      },
      intervalMs: 10,
      getFrame: () => frame,
    });
    loop.start();
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 40));
    loop.stop();
    expect(calls).toBe(1);
    expect(values).toEqual(["raw-1"]);
  });

  test("start is idempotent and stop clears the timer", async () => {
    let calls = 0;
    const loop = createScanLoop({
      decode: async () => undefined,
      onPayload: () => {
        calls += 1;
      },
      intervalMs: 10,
      getFrame: () => frame,
    });
    loop.start();
    loop.start();
    loop.stop();
    expect(calls).toBe(0);
    expect(loop.isRunning()).toBe(false);
  });
});

describe("capability and errors", () => {
  test("native support requires a working qr_code BarcodeDetector", async () => {
    // No BarcodeDetector in the test runtime → native is false without throwing.
    expect(await nativeQrSupported()).toBe(false);
  });

  test("error messages are explicit and actionable", () => {
    expect(errorMessage("insecure")).toContain("HTTPS");
    expect(errorMessage("permission-denied")).toContain("permission");
    expect(errorMessage("unsupported")).toContain("input field");
  });
});
