"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Briefing, Call, Note } from "@/lib/types";

type Stats = { missed: number; qualified: number; landline: number; wonAmount: number; wonCount: number };

const GROUPS: { key: Note["category"]; title: string; color: string }[] = [
  { key: "call_back", title: "À rappeler", color: "text-brand-dark" },
  { key: "order", title: "À commander", color: "text-[#075985]" },
  { key: "todo", title: "À faire", color: "text-[#1D5B43]" },
  { key: "other", title: "Autres", color: "text-muted" },
];

function euros(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
}

function formatPhone(p: string) {
  const fr = p.replace(/^\+33/, "0");
  return fr.length === 10 ? fr.replace(/(\d{2})(?=\d)/g, "$1 ") : p;
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MorningBoard({
  clientId,
  firstName,
  briefing,
  stats,
  priority,
  yesterdayNotes,
  todayNotes,
}: {
  clientId: string;
  firstName: string | null;
  briefing: Briefing | null;
  stats: Stats;
  priority: Pick<Call, "id" | "caller_phone" | "besoin_court" | "summary" | "urgent"> | null;
  yesterdayNotes: Note[];
  todayNotes: Note[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [notes, setNotes] = useState<Note[]>(todayNotes);
  const [draft, setDraft] = useState("");
  const [rec, setRec] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  async function addText() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("notes")
      .insert({ client_id: clientId, kind: "text", body, status: "ready" })
      .select("id, kind, body, audio_path, duration_s, status, category, created_at")
      .single();
    if (err) {
      setError("Note non enregistrée : " + err.message);
      return;
    }
    setDraft("");
    setNotes((ns) => [data as Note, ...ns]);
  }

  async function toggleRecord() {
    setError(null);
    if (rec && recorder.current) {
      recorder.current.stop();
      setRec(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mime });
        const duration = Math.round((Date.now() - startedAt.current) / 1000);
        const ext = mime === "audio/webm" ? "webm" : "m4a";
        const path = `${clientId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("voice-notes").upload(path, blob, { contentType: mime });
        if (up.error) {
          setError("Envoi du vocal impossible : " + up.error.message);
          return;
        }
        const { data, error: err } = await supabase
          .from("notes")
          .insert({ client_id: clientId, kind: "voice", audio_path: path, duration_s: duration, status: "pending" })
          .select("id, kind, body, audio_path, duration_s, status, category, created_at")
          .single();
        if (err) {
          setError("Note non enregistrée : " + err.message);
          return;
        }
        setNotes((ns) => [data as Note, ...ns]);
      };
      recorder.current = mr;
      startedAt.current = Date.now();
      mr.start();
      setRec(true);
    } catch {
      setError("Micro inaccessible. Autorisez le micro dans votre navigateur.");
    }
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: yesterdayNotes.filter((n) => (n.category ?? "other") === g.key && n.body),
  })).filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight">Bonjour{firstName ? ` ${firstName}` : ""}</h1>
        <span className="text-sm text-muted first-letter:uppercase">
          {today}
          {briefing ? " · briefing prêt" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-6">
          <section aria-label="Briefing" className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-[#F5F7FB]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold tracking-wider text-[#CBD5E1] uppercase">Briefing du matin</span>
                <span className="text-xl font-extrabold">Ta journée en 1 minute</span>
              </div>
              <span className="font-mono text-xs text-[#CBD5E1]">Voix : Inès · Cartesia</span>
            </div>
            {briefing ? (
              <>
                {briefing.audio_url && <audio controls src={briefing.audio_url} className="w-full" />}
                {(briefing.summary || briefing.script) && <p className="text-sm leading-relaxed text-[#CBD5E1]">{briefing.summary || briefing.script}</p>}
              </>
            ) : (
              <p className="text-sm leading-relaxed text-[#CBD5E1]">Ton premier briefing arrivera demain à 7 h. Il résumera tes appels de la veille et les notes que tu dictes aujourd&apos;hui.</p>
            )}
          </section>

          {priority && (
            <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-6">
              <h2 className="text-lg font-extrabold">À rappeler en premier</h2>
              <div className="flex flex-wrap items-center gap-3.5 rounded-[10px] border border-brand-soft bg-[#EFF6FF] p-3.5">
                {priority.urgent && <span className="rounded-full bg-urgent px-2.5 py-0.5 text-xs font-extrabold text-white">Urgent</span>}
                <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
                  <span className="text-[15px] font-bold">
                    {priority.besoin_court || "Lead qualifié"} · {formatPhone(priority.caller_phone)}
                  </span>
                  {priority.summary && <span className="text-sm text-muted">{priority.summary}</span>}
                </div>
                <a href={`tel:${priority.caller_phone}`} className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-sm font-bold text-white">
                  Rappeler
                </a>
              </div>
            </section>
          )}

          <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
            <h2 className="text-lg font-extrabold">Hier en chiffres</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
              <Stat value={String(stats.missed)} label="appels manqués" />
              <Stat value={String(stats.qualified)} label="leads qualifiés" />
              <Stat value={String(stats.landline)} label="fixes à rappeler" />
              <div className="flex flex-col gap-1 rounded-[10px] bg-navy p-3.5 text-[#F5F7FB]">
                <span className="text-[28px] font-extrabold text-cyan tabular-nums">+{euros(stats.wonAmount)}</span>
                <span className="text-[13px] text-[#CBD5E1]">
                  {stats.wonCount} chantier{stats.wonCount > 1 ? "s" : ""} gagné{stats.wonCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </section>

          {grouped.length > 0 && (
            <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-6">
              <h2 className="text-lg font-extrabold">Tes notes d&apos;hier, triées</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                {grouped.map((g) => (
                  <div key={g.title} className="flex flex-col gap-2">
                    <span className={`text-xs font-extrabold tracking-wider uppercase ${g.color}`}>{g.title}</span>
                    {g.items.map((n) => (
                      <label key={n.id} className="flex min-h-11 items-start gap-2.5 text-sm leading-snug">
                        <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-brand" />
                        <span>{n.body}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-2xl border border-line bg-white p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-extrabold">Notes du jour</h2>
            <span className="text-[13px] text-muted">Elles seront dans ton briefing de demain matin.</span>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl bg-bg py-5">
            <button
              type="button"
              onClick={toggleRecord}
              aria-pressed={rec}
              aria-label={rec ? "Arrêter l'enregistrement" : "Enregistrer une note vocale"}
              className={`flex h-24 w-24 items-center justify-center rounded-full text-white transition ${rec ? "animate-pulse bg-brand" : "bg-navy hover:bg-navy-2"}`}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
              </svg>
            </button>
            <span className={`text-sm font-bold ${rec ? "text-brand-dark" : "text-navy"}`}>{rec ? "Enregistrement… appuie pour arrêter" : "Appuie pour dicter une note"}</span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              addText();
            }}
            className="flex gap-2"
          >
            <label className="flex min-w-0 flex-1">
              <span className="sr-only">Écrire une note</span>
              <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ou écris une note…" className="min-h-11 min-w-0 flex-1 rounded-lg border border-line-2 px-3 text-sm outline-brand" />
            </label>
            <button type="submit" className="min-h-11 rounded-lg bg-navy px-4 text-sm font-bold text-white">
              Ajouter
            </button>
          </form>

          {error && <p className="text-sm font-semibold text-urgent">{error}</p>}

          <div className="flex flex-col gap-2.5">
            {notes.length === 0 && <p className="text-sm text-muted">Aucune note aujourd&apos;hui.</p>}
            {notes.map((n) => (
              <div key={n.id} className="flex gap-3 rounded-[10px] border border-[#EEF2F7] p-3">
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm ${n.kind === "voice" ? "bg-brand-soft text-brand-dark" : "bg-line text-[#334155]"}`}>{n.kind === "voice" ? "🎙" : "✎"}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm leading-snug">{n.body || (n.status === "pending" ? "Transcription en cours…" : n.status === "failed" ? "Transcription impossible" : "Note vocale")}</span>
                  <span className="font-mono text-xs text-muted">
                    {hhmm(n.created_at)} · {n.kind === "voice" ? `vocal${n.duration_s ? ` · 0:${String(n.duration_s).padStart(2, "0")}` : ""}` : "écrit"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[10px] bg-bg p-3.5">
      <span className="text-[28px] font-extrabold tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}
