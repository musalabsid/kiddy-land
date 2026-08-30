import * as React from "react";
import { useClient } from "./client-context";

function toIndonesianWords(n: number): string {
  if (n === 0) return "nol";
  const units=["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"] as const;
  if (n < 12) return units[n]!;
  if (n < 20) return units[n-10]! + " belas";
  if (n < 100) {
    const tens=Math.floor(n/10), ones=n%10;
    return units[tens]! + " puluh" + (ones ? " " + toIndonesianWords(ones) : "");
  }
  if (n < 200) return "seratus" + (n-100 ? " " + toIndonesianWords(n-100) : "");
  if (n < 1000) return (units[Math.floor(n/100)] as string) + " ratus" + (n%100 ? " " + toIndonesianWords(n%100) : "");
  return String(n);
}
export function useAlertSound(enabled?: boolean) {
  const client = useClient() as any;
  // Also listen to notification window event (server may send via notification service)
  React.useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as any;
      if (!detail || detail.type !== "notification") return;
      // notification message like "Tiket nomor 0004 tinggal 5 menit" - extract
      const msg = String(detail.message ?? "");
      if (!msg.includes("Tiket nomor")) return;
      const m = msg.match(/Tiket nomor\s+(\S+)/);
      const daily = m ? m[1] : "";
      const n = Number(daily);
      const human = Number.isNaN(n) ? daily : toIndonesianWords(n);
      // threshold from venue settings or parse
      const thrMatch = msg.match(/tinggal\s+(\d+)\s+menit/);
      const thr = thrMatch ? Number(thrMatch[1]) : 5;
      const thrWord = toIndonesianWords(thr);
      const text = "Tiket nomor " + human + ", waktu bermain tinggal " + thrWord + " menit lagi.";
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "id-ID"; utter.rate = 0.95;
        let voices = window.speechSynthesis.getVoices();
        const speak = () => { const idVoice = voices.find(v=> v.lang.startsWith("id")); if (idVoice) utter.voice = idVoice; window.speechSynthesis.speak(utter); };
        if (!voices.length) { window.speechSynthesis.addEventListener("voiceschanged", () => { voices = window.speechSynthesis.getVoices(); speak(); }, { once: true }); setTimeout(speak, 500); } else speak();
      }
    };
    window.addEventListener("kiddy-land-notification", handler as any);
    return () => window.removeEventListener("kiddy-land-notification", handler as any);
  }, []);
  React.useEffect(() => {
    if (enabled === false) return;
    let ws: WebSocket | undefined;
    try {
      const origin = client?.origin as string | undefined;
      if (!origin) return;
      const url = origin.replace(/^http/, "ws") + "/ws";
      const token = client.getToken?.() ?? (typeof window !== "undefined" ? window.localStorage.getItem("kiddy-land-token") : null);
      const q = token ? "?access_token=" + encodeURIComponent(token) : "";
      ws = new WebSocket(url + q);
      ws.onmessage = async (ev) => {
        try {
          const data = JSON.parse(ev.data as string);
          if (data.type !== "alert") return;
          const daily = String(data.dailyNumber ?? "");
          const n = Number(daily);
          const human = Number.isNaN(n) ? daily : toIndonesianWords(n);
          const thr = Number(data.threshold ?? 5);
          const thrWord = toIndonesianWords(thr);
          const text = "Tiket nomor " + human + ", waktu bermain tinggal " + thrWord + " menit lagi.";
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "id-ID";
            utter.rate = 0.95;
            // voices may be empty until onvoiceschanged fires — wait properly
            let voices = window.speechSynthesis.getVoices();
            if (!voices.length) { voices = await new Promise<SpeechSynthesisVoice[]>(resolve => { const onVoices = () => { window.speechSynthesis.removeEventListener("voiceschanged", onVoices); resolve(window.speechSynthesis.getVoices()); }; window.speechSynthesis.addEventListener("voiceschanged", onVoices); setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000); }); }
            const idVoice = voices.find(v=> v.lang.startsWith("id"));
            if (idVoice) utter.voice = idVoice;
            window.speechSynthesis.speak(utter);
          }
        } catch {}
      };
      if (ws) { ws.onerror = (e) => console.log("[alert] ws error", e); ws.onopen = () => console.log("[alert] ws open"); }
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, [client, enabled]);
}
