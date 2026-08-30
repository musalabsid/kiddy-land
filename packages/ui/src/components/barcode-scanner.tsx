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
  onDetect: (raw: string) => void;
  extract?: (raw: string) => string | undefined;
  startLabel?: string;
  repeatable?: boolean;
  className?: string;
};

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
  const [focusing, setFocusing] = React.useState(false);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | undefined>(() => {
    try { return localStorage.getItem("kiddy-land-selected-camera") || undefined; } catch { return undefined; }
  });
  const [showPicker, setShowPicker] = React.useState(false);

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

    // Expose all cams (including front) for manual picker
    try {
      const all = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
      setDevices(all.filter(d => d.kind === "videoinput"));
    } catch {}
    let stream: MediaStream;
    // Phone with 3 cameras: facingMode:"environment" may pick wide fixed-focus (0.5x) instead of main 1x.
    // Enumerate and pick the back camera that actually supports focusMode/focusDistance.
    const pickStream = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
        const cams = devices.filter(d => d.kind === "videoinput");
        // Prefer back-facing (label contains back/environment, or no label yet before permission -> fallback)
        if (selectedId) {
          try { return await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedId }, width: { ideal: 1280 }, height: { ideal: 720 } } }); } catch {}
        }
        const backCams = cams.filter(d => /back|environment|rear/i.test(d.label) || !d.label);
        const candidates = backCams.length ? backCams : cams;
        // Try each candidate by opening a temp stream and checking capabilities
        for (const dev of candidates) {
          try {
            const tmp = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: dev.deviceId } } });
            const tr = tmp.getVideoTracks()[0] as any;
            const caps = tr.getCapabilities?.();
            const hasContinuous = caps?.focusMode?.includes("continuous");
            const hasValidDistance = caps?.focusDistance && caps.focusDistance.min != null && caps.focusDistance.max != null && caps.focusDistance.min !== caps.focusDistance.max;
            const label = (dev.label||"").toLowerCase();
            const isUltraWide = label.includes("ultra") || label.includes("wide") && label.includes("0.5") || label.includes("0.5x");
            const isMain = hasContinuous || hasValidDistance;
            // skip ultra-wide fixed-focus even if it reports manual
            const hasFocus = isMain && !isUltraWide;
            tmp.getTracks().forEach(t => t.stop());
            if (hasFocus) {
              // this one has focus control (main 1x), use it
              return await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: dev.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } });
            }
          } catch {}
        }
      } catch {}
      // fallback to simple facingMode
      return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    };
    try {
      stream = await pickStream();
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
    if (cancelledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
    if (cancelledRef.current) return;
    streamRef.current = stream;
    // try continuous autofocus, fallback silently
    try {
      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities as any)?.();
      if (caps?.focusMode?.includes("continuous")) await (track as any).applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      else if (caps?.focusMode?.includes("auto")) await (track as any).applyConstraints({ advanced: [{ focusMode: "auto" }] });
    } catch {}
    const video = videoRef.current;
    if (!video) { stream.getTracks().forEach((track) => track.stop()); return; }
    video.srcObject = stream;
    try { await video.play(); } catch {}

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
        if (!value) return;
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
    try { if (selectedId) localStorage.setItem("kiddy-land-selected-camera", selectedId); else localStorage.removeItem("kiddy-land-selected-camera"); } catch {}
  }, [selectedId]);

  // When user picks a different camera while scanning, restart with new device
  const prevSelectedId = React.useRef<string | undefined>(undefined);
  const switchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!selectedId || selectedId === prevSelectedId.current) return;
    prevSelectedId.current = selectedId;
    if (status === "scanning") {
      switchedRef.current = true;
      cancel();
    }
  }, [selectedId]);

  React.useEffect(() => {
    if ((autoStart || switchedRef.current) && capability?.supported && (status === "idle" || status === "done")) {
      switchedRef.current = false;
      void start();
    }
  }, [autoStart, capability, status, start]);

  if (capability === undefined) return null;
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setShowPicker(v => !v)} className="relative z-10 shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent">
            {showPicker ? t("scanner.hideCameras") : t("scanner.showCameras")} {devices.length ? `(${devices.length})` : ""}
          </button>
          {!autoStart && <button type="button" onClick={cancel} className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-accent"><X className="size-3" /> {t("auth.scanCancel")}</button>}
        </div>
        {showPicker && devices.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-2">
            <div className="flex flex-wrap gap-1.5">
              {devices.map(d => (
                <button key={d.deviceId} type="button" onClick={() => setSelectedId(d.deviceId)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${selectedId===d.deviceId ? "bg-primary text-primary-foreground shadow" : "bg-background border hover:bg-accent"}`} title={d.label}>
                  {d.label ? d.label.slice(0,24) : `Camera ${d.deviceId.slice(0,4)}`} { /front/i.test(d.label) ? "🤳" : /ultra|wide/i.test(d.label) ? "0.5x" : "1x"}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">selected: {selectedId ? devices.find(d=>d.deviceId===selectedId)?.label?.slice(0,20) || selectedId.slice(0,8) : "auto (best focus)"} — tap a camera to switch</p>
          </div>
        )}
      </div>
      <div className={`relative cursor-pointer border ${focusing ? "ring-2 ring-primary border-primary" : "border-border"}`} onClick={async () => {
        setFocusing(true);
        try {
          const tr = streamRef.current?.getVideoTracks()[0] as any;
          if (tr) {
            const caps = tr.getCapabilities?.();
            if (caps?.focusMode?.includes("continuous")) await tr.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
            else if (caps?.focusMode?.includes("auto")) await tr.applyConstraints({ advanced: [{ focusMode: "auto" }] } as any);
            else if (caps?.focusMode?.includes("manual") && caps?.focusDistance) {
              const mid = (caps.focusDistance.min + caps.focusDistance.max) / 2;
              await tr.applyConstraints({ advanced: [{ focusMode: "manual", focusDistance: mid }] } as any);
            }
          }
        } catch {}
        setTimeout(() => setFocusing(false), 600);
      }}>
        <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full border border-border bg-muted object-cover pointer-events-none" title={t("scanner.tapToFocus")} />
        <button type="button" onClick={async (e) => { e.stopPropagation(); setFocusing(true); try { const tr=streamRef.current?.getVideoTracks()[0] as any; if(tr) await tr.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any); } catch { try { const tr2=streamRef.current?.getVideoTracks()[0] as any; await tr2?.applyConstraints({ advanced: [{ focusMode: "single-shot" }] } as any); } catch {} } setTimeout(()=>setFocusing(false),600); }} className="absolute inset-x-2 bottom-2 rounded bg-background/90 py-2 text-sm font-medium backdrop-blur hover:bg-background">{t("scanner.tapToFocus")} — {t("scanner.holdDistance")}</button>
        {focusing && <span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">Focusing…</span>}
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
