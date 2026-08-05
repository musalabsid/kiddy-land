import { useLocale } from "@kiddy-land/localization/react";
import { Button } from "@workspace/ui/components/button";
import { parsePairingQr } from "@workspace/ui/lib/pairing-qr";
import { ScanLine, X } from "lucide-react";
import * as React from "react";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = new (options?: { formats?: string[] }) => {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};

function scannerCapability(): "ok" | "insecure" | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure";
  const BarcodeDetector = (
    window as Window & { BarcodeDetector?: BarcodeDetectorLike }
  ).BarcodeDetector;
  if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia)
    return "unsupported";
  return "ok";
}

export function QrPairingScanner({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const { t } = useLocale();
  const capability = React.useMemo(scannerCapability, []);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | undefined>(undefined);
  const timerRef = React.useRef<number | undefined>(undefined);
  const [scanning, setScanning] = React.useState(false);
  const [starting, setStarting] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const stop = React.useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }, []);
  React.useEffect(() => stop, [stop]);

  const start = async () => {
    if (starting || scanning) return;
    setStarting(true);
    setError(undefined);
    const BarcodeDetector = (
      window as Window & { BarcodeDetector?: BarcodeDetectorLike }
    ).BarcodeDetector;
    if (!BarcodeDetector) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
    } catch {
      setError(t("auth.scanError"));
      setStarting(false);
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setScanning(true);
    await videoRef.current?.play().catch(() => undefined);
    let detector: InstanceType<BarcodeDetectorLike>;
    try {
      detector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      stop();
      setScanning(false);
      setStarting(false);
      setError(t("auth.scanUnsupported"));
      return;
    }
    setStarting(false);
    timerRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      void detector
        .detect(video)
        .then((codes) => {
          const raw = codes.find((code) => code.rawValue)?.rawValue;
          const token = raw ? parsePairingQr(raw) : undefined;
          if (!token) return;
          stop();
          setScanning(false);
          onToken(token);
        })
        .catch(() => undefined);
    }, 250);
  };

  if (capability === "insecure")
    return (
      <p role="note" className="text-xs text-muted-foreground">
        {t("auth.scanSecureContext")}
      </p>
    );
  if (capability === "unsupported")
    return (
      <p role="note" className="text-xs text-muted-foreground">
        {t("auth.scanUnsupported")}
      </p>
    );
  if (!scanning) {
    return (
      <div className="grid gap-2">
        <Button type="button" variant="outline" disabled={starting} onClick={() => void start()}>
          <ScanLine data-icon="inline-start" />
          {t("auth.scanQr")}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">{t("auth.scanHint")}</p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-[4/3] w-full border border-border bg-muted object-cover"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          stop();
          setScanning(false);
        }}
      >
        <X data-icon="inline-start" />
        {t("auth.scanCancel")}
      </Button>
    </div>
  );
}
