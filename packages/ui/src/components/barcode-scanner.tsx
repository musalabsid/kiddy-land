import * as React from "react";
import { Button } from "@workspace/ui/components/button";
import { useLocale } from "@workspace/ui/lib/i18n";
import { ScanLine, X } from "lucide-react";
import {
  SCAN_FORMATS,
  createJsqrDecoder,
  createNativeDecoder,
  createScanLoop,
  detectCapability,
  errorMessage,
  nativeQrSupported,
  type ScanStatus,
  type ScannerError,
} from "@workspace/ui/lib/barcode-scan";

export type BarcodeScannerProps = {
  autoStart?: boolean;
  /** Called exactly once per successful detection, with the raw scanned value. */
  onDetect: (raw: string) => void;
  /** Optional parse transform; only the returned value is submitted. Return undefined to ignore. */
  extract?: (raw: string) => string | undefined;
  /** Primary label for the start button. Defaults to "Scan QR code". */
  startLabel?: string;
  /** Re-enable the start button after a successful detection (pairing fills the token once). */
  repeatable?: boolean;
  className?: string;
};

/**
 * Shared camera-first barcode/QR scanner. Native BarcodeDetector when it
 * verifiably supports qr_code; otherwise jsQR over a hidden canvas. Permission
 * is requested only after the user clicks the start button, and all media
 * tracks are stopped on cancel, success, unmount, and errors. Exactly one
 * detection fires `onDetect`.
 *
 * Renders nothing (and never touches the camera) when the platform is not a
 * secure context with camera support — callers keep manual entry available.
 */
export function BarcodeScanner({
  onDetect,
  extract,
  startLabel,
  repeatable = false,
  autoStart = false,
  className,
}: BarcodeScannerProps) {
  const { t } = useLocale();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | undefined>(undefined);
  const loopRef = React.useRef<ReturnType<typeof createScanLoop> | undefined>(undefined);
  const cancelledRef = React.useRef(false);
  const onDetectRef = React.useRef(onDetect);
  const extractRef = React.useRef(extract);
  onDetectRef.current = onDetect;
  extractRef.current = extract;

  const [status, setStatus] = React.useState<ScanStatus>("idle");
  const [error, setError] = React.useState<ScannerError | undefined>(undefined);
  const [capability, setCapability] = React.useState<Awaited<ReturnType<typeof detectCapability>> | undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    void detectCapability().then((value) => { if (alive) setCapability(value); });
    return () => { alive = false; };
  }, []);

  const stop = React.useCallback(() => {
    cancelledRef.current = true;
    loopRef.current?.stop();
    loopRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  // Unmount / capability change: always release the camera.
  React.useEffect(() => stop, [stop]);

  const fail = React.useCallback((next: ScannerError) => {
    stop();
    setStatus("error");
    setError(next);
  }, [stop]);

  const start = React.useCallback(async () => {
    if (status === "scanning" || status === "starting") return;
    setStatus("starting");
    setError(undefined);
    cancelledRef.current = false;
    const secure = typeof window !== "undefined" && window.isSecureContext === true;
    if (!secure) { fail({ kind: "insecure" }); return; }
    if (!navigator.mediaDevices?.getUserMedia) { fail({ kind: "unsupported" }); return; }
    const native = await nativeQrSupported();
    if (!native && !createJsqrDecoder) { fail({ kind: "decode-unavailable" }); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch (cause) {
      const kind: ScannerError["kind"] =
        cause instanceof DOMException && (cause.name === "NotAllowedError" || cause.name === "PermissionDeniedError")
          ? "permission-denied"
          : cause instanceof DOMException && cause.name === "NotFoundError"
            ? "no-camera"
            : "unsupported";
      fail({ kind });
      return;
    }
    if (cancelledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; } // cancelled while awaiting permission
    if (cancelledRef.current) return; // cancelled while permission prompt was open
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach((track) => track.stop()); return; }
    video.srcObject = stream;
    try { await video.play(); } catch { /* play is async; loop only decodes frames with readyState>=2 */ }

    let decode: (frame: HTMLVideoElement) => Promise<string | undefined>;
    if (native) {
      try {
        const Ctor = (window as Window & { BarcodeDetector?: new (options?: { formats?: string[] }) => { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
        if (!Ctor) { fail({ kind: "decode-unavailable" }); return; }
        decode = createNativeDecoder(new Ctor({ formats: [...SCAN_FORMATS] }));
      } catch { fail({ kind: "decode-unavailable" }); return; }
    } else {
      const canvas = canvasRef.current;
      if (!canvas) { fail({ kind: "unsupported" }); return; }
      decode = createJsqrDecoder(canvas, canvas.getContext("2d"));
    }

    const loop = createScanLoop({
      decode,
      intervalMs: 200,
      onPayload: (raw) => {
        const value = extractRef.current ? extractRef.current(raw) : raw;
        if (!value) return; // ignore, keep scanning
        stop();
        setStatus("done");
        onDetectRef.current(value);
        if (repeatable) setTimeout(() => setStatus("idle"), 600);
      },
    });
    loopRef.current = loop;
    setStatus("scanning");
    loop.start();
  }, [fail, repeatable, status, stop]);

  const cancel = React.useCallback(() => {
    stop();
    setStatus("idle");
    setError(undefined);
  }, [stop]);

  React.useEffect(() => {
    if (autoStart && capability?.supported && (status === "idle" || status === "done")) {
      void start();
    }
  }, [autoStart, capability, status, start]); // autoStart triggered by parent user gesture

  if (capability === undefined) return null; // capability probe in flight
  if (!capability.supported) {
    const note = !capability.secure ? errorMessage("insecure") : !capability.camera ? errorMessage("no-camera") : errorMessage("unsupported");
    return <p role="note" className="text-xs text-muted-foreground">{note}</p>;
  }
  if (status === "idle" || status === "done") {
    return (
      <div className={className}>
        <Button type="button" variant="outline" onClick={() => void start()}>
          <ScanLine data-icon="inline-start" />
          {startLabel ?? t("auth.scanQr")}
        </Button>
        {error && <p role="alert" className="text-xs text-destructive">{errorMessage(error.kind)}</p>}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className={className}>
        <p role="alert" className="text-xs text-destructive">{error ? errorMessage(error.kind) : t("auth.scanError")}</p>
        <Button type="button" variant="outline" onClick={cancel}><X data-icon="inline-start" />{t("auth.scanCancel")}</Button>
      </div>
    );
  }
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{t("auth.scanHint")}</p>
      <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full border border-border bg-muted object-cover" />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <Button type="button" variant="outline" onClick={cancel}><X data-icon="inline-start" />{t("auth.scanCancel")}</Button>
    </div>
  );
}
