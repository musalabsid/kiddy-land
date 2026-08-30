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
  const client = useClient();
  React.useEffect(() => {
    if (enabled === false) return;
    let ws: WebSocket | undefined;
    try {
      const origin = (client as any)?.origin as string | undefined;
      if (!origin) return;
      const url = origin.replace(/^http/, "ws") + "/ws";
      const token = typeof window !== "undefined" ? window.localStorage.getItem("kiddy-land-token") : null;
      const q = token ? "?access_token=" + encodeURIComponent(token) : "";
      ws = new WebSocket(url + q);
      ws.onmessage = (ev) => {
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
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find(v=> v.lang.startsWith("id"));
            if (idVoice) utter.voice = idVoice;
            window.speechSynthesis.speak(utter);
          }
        } catch {}
      };
    } catch {}
    return () => { try { ws?.close(); } catch {} };
  }, [client, enabled]);
}
