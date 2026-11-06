"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_SECONDS = 120;

function mmss(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function FloatingNoteButton({ clientId }: { clientId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<"idle" | "rec" | "saving">("idle");
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(text: string, error = false) {
    setToast({ text, error });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), error ? 6000 : 2800);
  }

  function clearTimer() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  function stop(cancel = false) {
    cancelled.current = cancel;
    clearTimer();
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }

  useEffect(() => {
    return () => {
      cancelled.current = true;
      clearTimer();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    };
  }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      cancelled.current = false;
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled.current) {
          setState("idle");
          setSeconds(0);
          return;
        }
        setState("saving");
        const blob = new Blob(chunks.current, { type: mime });
        const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const ext = mime === "audio/webm" ? "webm" : "m4a";
        const path = `${clientId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: mime });
        if (up.error) {
          setState("idle");
          setSeconds(0);
          show("Envoi du vocal impossible : " + up.error.message, true);
          return;
        }
        const { data, error: err } = await supabase
          .from("notes")
          .insert({ client_id: clientId, kind: "voice", audio_path: path, duration_s: duration, status: "pending" })
          .select("id, kind, body, audio_path, duration_s, status, category, created_at")
          .single();
        setState("idle");
        setSeconds(0);
        if (err) {
          show("Note non enregistrée : " + err.message, true);
          return;
        }
        window.dispatchEvent(new CustomEvent("lr:note", { detail: data }));
        show("Note enregistrée. Elle sera dans votre briefing de demain.");
      };
      recorder.current = mr;
      startedAt.current = Date.now();
      mr.start();
      setSeconds(0);
      setState("rec");
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      show("Micro inaccessible. Autorisez le micro dans votre navigateur.", true);
    }
  }

  function onMain() {
    if (state === "idle") start();
    else if (state === "rec") stop();
  }

  return (
    <>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
        {toast && (
          <p className={`max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.error ? "bg-red-50 text-urgent" : "bg-navy text-[#F5F7FB]"}`}>
            {toast.text}
          </p>
        )}
      </div>

      <div className="fixed right-5 z-50 flex items-center gap-3" style={{ bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        {state === "rec" && (
          <>
            <button
              type="button"
              onClick={() => stop(true)}
              className="min-h-11 rounded-full border border-line-2 bg-white px-4 text-sm font-bold text-muted shadow-md hover:bg-bg"
            >
              Annuler
            </button>
            <span className="min-w-[3.25rem] rounded-full bg-white px-3 py-2 text-center text-sm font-extrabold text-urgent tabular-nums shadow-md">
              {mmss(seconds)}
            </span>
          </>
        )}

        <button
          type="button"
          onClick={onMain}
          disabled={state === "saving"}
          aria-label={state === "rec" ? "Terminer et enregistrer la note" : state === "saving" ? "Enregistrement en cours" : "Enregistrer une note vocale"}
          className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-colors disabled:opacity-70 ${
            state === "rec" ? "bg-urgent" : "bg-brand hover:bg-brand-dark"
          }`}
        >
          {state === "rec" && <span className="absolute inset-0 animate-ping rounded-full bg-urgent opacity-40" />}
          {state === "idle" && (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v4" />
            </svg>
          )}
          {state === "rec" && <span className="relative h-5 w-5 rounded-[4px] bg-white" />}
          {state === "saving" && <span className="relative h-6 w-6 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />}
        </button>
      </div>
    </>
  );
}
