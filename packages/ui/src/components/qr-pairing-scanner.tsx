import { parsePairingQr } from "@workspace/ui/lib/pairing-qr";
import { BarcodeScanner } from "@workspace/ui/components/barcode-scanner";

/**
 * Camera-first QR pairing scanner. Decodes the DeviceManagement QR payload
 * ({origin, token, kind}), extracts the token, and submits the pairing form
 * immediately. Manual token entry stays available below the scanner.
 */
export function QrPairingScanner({
  onToken,
  onSubmit,
}: {
  onToken: (token: string) => void;
  onSubmit?: (token: string) => void;
}) {
  return (
    <BarcodeScanner
      extract={parsePairingQr}
      onDetect={(token) => {
        onToken(token);
        onSubmit?.(token);
      }}
    />
  );
}
