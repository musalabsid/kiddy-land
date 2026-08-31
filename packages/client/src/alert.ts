import * as React from "react";

import bellUrl from "../bell-intro.mp3";

function toIndonesianWords(n: number): string {
  if (n === 0) return "nol";
  const units = [
    "",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
  ] as const;
  if (n < 12) return units[n]!;
  if (n < 20) return units[n - 10]! + " belas";
  if (n < 100) {
    const tens = Math.floor(n / 10),
      ones = n % 10;
    return (
      units[tens]! + " puluh" + (ones ? " " + toIndonesianWords(ones) : "")
    );
  }
  if (n < 200)
    return "seratus" + (n - 100 ? " " + toIndonesianWords(n - 100) : "");
  if (n < 1000)
    return (
      (units[Math.floor(n / 100)] as string) +
      " ratus" +
      (n % 100 ? " " + toIndonesianWords(n % 100) : "")
    );
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

// Autoplay policy: WS alerts are not user gestures — unlock audio + TTS after first interaction
const unlockAudio = () => {
  try {
    const ctx = new AudioContext();
    void ctx.resume();
    void ctx.close();
  } catch {}
  try {
    const ss = window.speechSynthesis;
    if (ss) {
      if (ss.paused) ss.resume();
      // prime TTS with a silent utterance so speak() is allowed outside gestures later
      const prime = new SpeechSynthesisUtterance(" ");
      prime.volume = 0;
      ss.speak(prime);
    }
  } catch {}
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
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
    const safeSpeakText = (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return;
      const ss = window.speechSynthesis;
      try {
        if (ss.paused) ss.resume();
      } catch {}
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "id-ID";
      utter.rate = 0.95;
      let done = false;
      let poll: ReturnType<typeof setInterval> | undefined;
      const attempt = () => {
        if (done) return;
        done = true;
        if (poll) clearInterval(poll);
        const voices = ss.getVoices();
        const idVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith("id")) ??
          voices[0];
        if (idVoice) utter.voice = idVoice;
        try {
          ss.speak(utter);
        } catch {}
      };
      const onVoices = () => {
        ss.removeEventListener("voiceschanged", onVoices);
        attempt();
      };
      if (ss.getVoices().length) {
        attempt();
        return;
      }
      ss.addEventListener("voiceschanged", onVoices);
      let tries = 0;
      poll = setInterval(() => {
        if (ss.getVoices().length || ++tries >= 30) {
          ss.removeEventListener("voiceschanged", onVoices);
          attempt();
        }
      }, 300);
    };
    // Server sends type:"alert" with dailyNumber/threshold (5-min timer) — bridged by RealtimeSync
    // Server sends type:"alert" with dailyNumber/threshold (5-min timer) — bridged by RealtimeSync
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as any;
      if (!detail || detail.type !== "alert") return;
      if (detail.sound === false) return;
      const daily = String(detail.dailyNumber ?? "");
      const thr = Number(detail.threshold ?? 5);
      const thrWord = toIndonesianWords(Math.max(1, thr));
      // name calling: read child name ("Anak {name} ..."); fallback to dailyNumber when missing
      let subject = "";
      const rawName = detail.nameCalling ? String(detail.childName ?? "") : "";
      const isName = rawName.trim().length > 0;
      if (isName) {
        subject = rawName
          .trim()
          .slice(0, 30)
          .replace(/[""“”'‘’]/g, "");
      } else {
        const n = Number(daily);
        subject = Number.isNaN(n) ? daily : toIndonesianWords(n);
      }
      const text = isName
        ? "Anak " +
          subject +
          ", waktu bermain tinggal " +
          thrWord +
          " menit lagi."
        : "Tiket nomor " +
          subject +
          ", waktu bermain tinggal " +
          thrWord +
          " menit lagi.";
      const safeSpeak = () => {
        try {
          safeSpeakText(text);
          // repeat once more (default) — sentence spoken twice
          setTimeout(() => {
            try {
              safeSpeakText(text);
            } catch {}
          }, 900);
        } catch {}
      };
      playBell()
        .then(() => setTimeout(safeSpeak, 800))
        .catch(safeSpeak);
    };
    window.addEventListener("kiddy-land-alert", handler as any);
    return () => window.removeEventListener("kiddy-land-alert", handler as any);
  }, [enabled]);
}
