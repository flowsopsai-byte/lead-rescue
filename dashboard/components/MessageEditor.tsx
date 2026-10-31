"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClientSettings } from "@/lib/types";

const VOICES = [{ id: "7c58f4a4-a72c-42fa-a503-41b9408820f3", label: "Inès · posée, professionnelle" }];
const DEFAULT_VOICE = VOICES[0].id;

export default function MessageEditor({ initial }: { initial: ClientSettings }) {
  const supabase = useMemo(() => createClient(), []);
  const [saved, setSaved] = useState(initial);
  const [msg, setMsg] = useState(initial.voice_message);
  const [sms, setSms] = useState(initial.sms_template);
  const [voice, setVoice] = useState(initial.voice_id || DEFAULT_VOICE);
  const [relance, setRelance] = useState(initial.relance_enabled);
  const [state, setState] = useState<"idle" | "saving" | "publishing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const voiceChanged = msg !== saved.voice_message || voice !== (saved.voice_id || DEFAULT_VOICE);
  const dirty = voiceChanged || sms !== saved.sms_template || relance !== saved.relance_enabled;

  const words = msg.trim() ? msg.trim().split(/\s+/).length : 0;
  const secs = Math.max(1, Math.round(words / 2.6));
  const smsPreview = sms.replaceAll("{entreprise}", initial.name).replaceAll("{lien}", "lr.flowsopsai.com/c/8f2k");
  const len = smsPreview.length;
  const parts = len <= 160 ? 1 : Math.ceil(len / 153);

  async function publish() {
    setError(null);
    setState("saving");
    const { error: err } = await supabase
      .from("clients")
      .update({ voice_message: msg, sms_template: sms, voice_id: voice, relance_enabled: relance })
      .eq("id", initial.id);
    if (err) {
      setState("error");
      setError("Enregistrement impossible : " + err.message);
      return;
    }
    let audio_url = saved.audio_url;
    if (voiceChanged) {
      setState("publishing");
      const res = await fetch("/api/publish-voice", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setError(json.error || "La génération de la voix a échoué.");
        return;
      }
      audio_url = json.audio_url ? `${json.audio_url}?v=${Date.now()}` : audio_url;
    }
    setSaved({ ...saved, voice_message: msg, sms_template: sms, voice_id: voice, relance_enabled: relance, audio_url });
    setState("done");
  }

  const statusText =
    state === "saving" ? "Enregistrement…" : state === "publishing" ? "Génération de la voix…" : dirty ? "Modifications non publiées" : state === "done" ? "Publié · actif dès le prochain appel" : "À jour";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Ce que l&apos;appelant reçoit</h1>
          <p className="text-sm leading-relaxed text-muted">Le message vocal joué quand vous ne décrochez pas, puis le SMS envoyé dans les secondes qui suivent.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[13px] font-semibold ${dirty ? "text-brand-dark" : "text-muted"}`}>{statusText}</span>
          <button
            type="button"
            onClick={publish}
            disabled={!dirty || state === "saving" || state === "publishing"}
            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:bg-line disabled:text-muted"
          >
            Publier
          </button>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-urgent">{error}</p>}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold">Message vocal</h2>
              <span className="text-[13px] text-muted">Joué à l&apos;appelant, puis l&apos;appel se termine. La voix est régénérée à chaque publication.</span>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Texte lu</span>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} className="w-full resize-y rounded-lg border border-line-2 p-3.5 text-[15px] leading-relaxed outline-brand" />
            </label>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <label className="flex max-w-xs flex-[1_1_220px] flex-col gap-2">
                <span className="text-[13px] font-bold">Voix · Cartesia Sonic (français)</span>
                <select value={voice} onChange={(e) => setVoice(e.target.value)} className="min-h-11 rounded-lg border border-line-2 bg-white px-3 text-sm outline-brand">
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] text-muted">≈ {secs} s</span>
                <button
                  type="button"
                  disabled={!saved.audio_url}
                  onClick={() => audioRef.current?.play()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-2 bg-white px-4 text-sm font-bold disabled:opacity-40"
                >
                  ▶ Écouter la version publiée
                </button>
                {saved.audio_url && <audio ref={audioRef} src={saved.audio_url} preload="none" />}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold">SMS envoyé</h2>
              <span className="text-[13px] text-muted">Part dans les secondes qui suivent l&apos;appel manqué, avec le lien vers le chat de qualification.</span>
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-bold">Texte du SMS</span>
              <textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={3} className="w-full resize-y rounded-lg border border-line-2 p-3.5 text-[15px] leading-relaxed outline-brand" />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                Variables :<code className="rounded-md bg-bg px-2 py-1 font-mono text-xs text-navy">{"{entreprise}"}</code>
                <code className="rounded-md bg-bg px-2 py-1 font-mono text-xs text-navy">{"{lien}"}</code>
              </div>
              <span className={`font-mono text-[13px] ${parts > 1 ? "text-brand-dark" : "text-muted"}`}>
                {len} / 160 · {parts} SMS
              </span>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-6 py-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-extrabold">Relance automatique</h2>
              <span className="text-[13px] text-muted">Un 2ᵉ SMS si le lien n&apos;est pas ouvert dans l&apos;heure. Coupée dès que l&apos;appel est marqué rappelé.</span>
            </div>
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-bold">
              <input type="checkbox" checked={relance} onChange={(e) => setRelance(e.target.checked)} className="h-5 w-5 accent-brand" />
              Activée
            </label>
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-5 rounded-2xl bg-navy p-6 text-[#F5F7FB]">
          <span className="text-xs font-extrabold tracking-wider text-[#CBD5E1] uppercase">Aperçu côté appelant</span>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-navy-2 text-[13px] font-extrabold">1</span>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[13px] font-bold">Appel · message vocal</span>
              <p className="text-[13px] leading-relaxed text-[#CBD5E1] italic">« {msg.replaceAll("{entreprise}", initial.name)} »</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-navy-2 text-[13px] font-extrabold">2</span>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-[13px] font-bold">SMS reçu · quelques secondes plus tard</span>
              <p className="rounded-[14px_14px_14px_4px] bg-[#F5F7FB] px-3.5 py-3 text-[13px] leading-relaxed text-navy">{smsPreview}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand text-[13px] font-extrabold">3</span>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">Chat de qualification</span>
              <a href="/questions" className="text-[13px] font-bold text-cyan">
                Modifier les questions →
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
