import * as React from "react";
import JsBarcode from "jsbarcode";
import { Button } from "@workspace/ui/components/button";

export function MemberCardPrint({ name, code, phone }: { name: string; code: string; phone?: string }) {
  const barcodeRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!barcodeRef.current) return;
    JsBarcode(barcodeRef.current, code, { format: "CODE128", displayValue: true, fontSize: 14, height: 56, margin: 0, width: 2 });
  }, [code]);

  return <main className="min-h-screen bg-white p-6 text-black print:min-h-0 print:bg-white print:p-0 print:text-black">
    <div className="mx-auto grid max-w-sm gap-4">
      <section className="member-card grid gap-4 border border-black bg-white p-6 text-black shadow-sm print:mx-0 print:w-[85.6mm] print:rounded-none print:border print:p-4 print:shadow-none">
        <p className="text-sm font-semibold tracking-wide text-black">KIDDY LAND</p>
        <div><p className="text-xl font-semibold text-black">{name}</p><p className="text-xs text-black">{phone ? `${phone.slice(0, 3)}••••${phone.slice(-3)}` : ""}</p></div>
        <svg ref={barcodeRef} className="h-auto w-full" aria-label={`Membership barcode ${code}`} />
      </section>
      <Button type="button" className="print:hidden" onClick={() => window.print()}>Print membership card</Button>
    </div>
  </main>;
}
