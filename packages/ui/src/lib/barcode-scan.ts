import jsQR from "jsqr";

export type ScanStatus = "idle" | "starting" | "scanning" | "done" | "error";

export type ScannerErrorKind =
  | "insecure"
  | "unsupported"
  | "permission-denied"
  | "no-camera"
  | "decode-unavailable";

export type ScannerError = {
  kind: ScannerErrorKind;
  message?: string;
};

export type ScannerCapability = {
  /** "native" when BarcodeDetector exists AND supports qr_code (verified). */
  decoder: "native" | "jsqr" | "none";
  secure: boolean;
  camera: boolean;
  supported: boolean;
  supportsBarcode: boolean;
};

export function isSecureContextAvailable(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

/** @hidden exposed for tests */
export function hasMediaDevices(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap): Promise<Array<{ rawValue: string }>>;
  getSupportedFormats?: () => Promise<string[]>;
};

function nativeBarcodeDetector(): BarcodeDetectorCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

/** True only when BarcodeDetector can actually decode qr_code (constructor + formats). */
export const SCAN_FORMATS = ["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e"] as const;
export async function nativeQrSupported(): Promise<boolean> {
  const Ctor = nativeBarcodeDetector();
  if (!Ctor) return false;
  try {
    const probe = new Ctor({ formats: [...SCAN_FORMATS] });
    if (!probe || typeof probe.detect !== "function") return false;
    if (typeof probe.getSupportedFormats === "function") {
      const formats = await probe.getSupportedFormats();
      return Array.isArray(formats) && SCAN_FORMATS.some(f => formats.includes(f));
    }
    return true;
  } catch {
    return false;
  }
}

export async function detectCapability(): Promise<ScannerCapability> {
  const secure = isSecureContextAvailable();
  const camera = hasMediaDevices();
  const native = await nativeQrSupported();
  // Check if native actually supports EAN (barcode), not just QR
  let supportsBarcode = false;
  if (native) {
    try {
      const Ctor = nativeBarcodeDetector();
      if (Ctor && typeof (new Ctor({formats:["ean_13"]}) as any).getSupportedFormats === 'function') {
        const fmts = await new Ctor({formats:["ean_13"]}).getSupportedFormats?.();
        supportsBarcode = Array.isArray(fmts) && fmts.includes("ean_13");
      } else {
        supportsBarcode = true; // native exists but no getSupportedFormats -> assume supports all
      }
    } catch { supportsBarcode = true; }
  }
  return {
    decoder: native ? "native" : camera ? "jsqr" : "none",
    secure,
    camera,
    supported: secure && camera && (native || jsQR !== undefined),
    supportsBarcode,
  };
}

/**
 * Deterministic single-fire scanner loop. Each tick decodes the current video
 * frame; the first raw value that yields a payload triggers `onPayload` exactly
 * once, then the loop stops. Tracks are only stopped via `stop()` so the caller
 * controls cancellation and unmount cleanup.
 */
export function createScanLoop(options: {
  decode: (frame: HTMLVideoElement) => Promise<string | undefined>;
  onPayload: (raw: string) => void;
  intervalMs?: number;
  /** Frame source; defaults to `document.querySelector("video")`. Injected for tests. */
  getFrame?: () => HTMLVideoElement | null;
}): { start: () => void; stop: () => void; isRunning: () => boolean } {
  const intervalMs = options.intervalMs ?? 200;
  const getFrame = options.getFrame ?? (() => document.querySelector("video"));
  let timer: ReturnType<typeof setInterval> | undefined;
  let fired = false;
  let running = false;
  const tick = async () => {
    if (fired || !running) return;
    const frame = getFrame();
    if (!frame) return;
    let raw: string | undefined;
    try {
      raw = await options.decode(frame);
    } catch {
      return; // transient decode failure, keep scanning
    }
    if (!raw || fired) return;
    fired = true;
    running = false;
    stop();
    options.onPayload(raw);
  };
  const start = () => {
    if (running || fired) return;
    running = true;
    timer = setInterval(() => void tick(), intervalMs);
    void tick();
  };
  const stop = () => {
    running = false;
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  return { start, stop, isRunning: () => running || fired };
}

export function createNativeDecoder(detector: { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> }) {
  return async (frame: HTMLVideoElement) => {
    const codes = await detector.detect(frame);
    return codes.find((code) => code.rawValue)?.rawValue;
  };
}

export function createJsqrDecoder(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D | null) {
  return async (frame: HTMLVideoElement) => {
    if (!context || frame.readyState < 2 || !frame.videoWidth) return undefined;
    canvas.width = frame.videoWidth;
    canvas.height = frame.videoHeight;
    context.drawImage(frame, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(image.data, image.width, image.height);
    return result?.data;
  };
}

export function barcodeErrorMessage(capability?: ScannerCapability): string | undefined {
  if (capability && !capability.supportsBarcode) return "Product barcode scanning needs Chrome/Edge with native BarcodeDetector (EAN). This browser only decodes QR — ticket QR still works, use manual input for product EAN.";
  return undefined;
}
export function errorMessage(kind: ScannerErrorKind): string {
  switch (kind) {
    case "insecure": return "Camera access requires HTTPS (or localhost). This page is served over plain HTTP.";
    case "unsupported": return "This browser does not support camera scanning. Use the input field below instead.";
    case "permission-denied": return "Camera permission was denied. Allow camera access, or use the input field below.";
    case "no-camera": return "No camera is available on this device. Use the input field below instead.";
    case "decode-unavailable": return "QR decoding is unavailable in this browser. Use the input field below instead.";
  }
}
