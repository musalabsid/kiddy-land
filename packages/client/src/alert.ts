/// <reference path="./assets.d.ts" />
import * as React from "react";
import bellUrl from "../bell-intro.mp3";

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

// Cached Audio element (reuse across alerts; Vite serves /bell-intro.mp3 from client package)
let bell: HTMLAudioElement | null = null;
function playBell(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  try {
    if (!bell) {
      bell = new Audio(bellUrl);
      bell.preload = "auto";
    }
    bell.currentTime = 0;
    return bell.play();
  } catch {
    return Promise.reject(new Error("bell-play-failed"));
  }
}

// Autoplay policy: WS alerts are not user gestures — unlock audio after first interaction
const unlockAudio = () => {
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    void ctx.close();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  } catch {}
};

export function useAlertSound(enabled?: boolean) {
  React.useEffect(() => {
    if (enabled === false) return;
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [enabled]);

  React.useEffect(() => {
    if (enabled === false) return;
    const speak =
      (text: string) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch {}
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "id-ID"; utter.rate = 0.95;
        let voices = window.speechSynthesis.getVoices();
        const doSpeak = () => { const idVoice = voices.find(v => v.lang.startsWith("id")); if (idVoice) utter.voice = idVoice; window.speechSynthesis.speak(utter); };
        if (!voices.length) {
          window.speechSynthesis.addEventListener("voiceschanged", () => { voices = window.speechSynthesis.getVoices(); doSpeak(); }, { once: true });
          setTimeout(doSpeak, 500);
        } else {
          doSpeak();
        }
      };
    // Server sends type:"alert" with dailyNumber/threshold (5-min timer) — bridged by RealtimeSync
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as any;
      if (!detail || detail.type !== "alert") return;
      if (detail.sound === false) return;
      const daily = String(detail.dailyNumber ?? "");
      if (!daily) return;
      const n = Number(daily);
      const human = Number.isNaN(n) ? daily : toIndonesianWords(n);
      const thr = Number(detail.threshold ?? 5);
      const thrWord = toIndonesianWords(Math.max(1, thr));
      const text = "Tiket nomor " + human + ", waktu bermain tinggal " + thrWord + " menit lagi.";
      const safeSpeak = () => { try { speak(text); } catch {} };
      playBell().then(() => setTimeout(safeSpeak, 800)).catch(safeSpeak);
    };
    window.addEventListener("kiddy-land-alert", handler as any);
    return () => window.removeEventListener("kiddy-land-alert", handler as any);
  }, [enabled]);
}
