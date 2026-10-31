"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AnswerType, Question } from "@/lib/types";

const TYPES: { value: AnswerType; label: string; hint: string }[] = [
  { value: "text", label: "Texte libre", hint: "Réponse libre" },
  { value: "choice", label: "Choix", hint: "Choix" },
  { value: "address", label: "Adresse", hint: "Adresse avec autocomplétion" },
  { value: "slot", label: "Créneau", hint: "Choix d'un créneau" },
  { value: "photo", label: "Photo", hint: "Envoi d'une photo" },
];

export default function QuestionsEditor({ clientName, initial }: { clientName: string; initial: Question[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Question[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = JSON.stringify(items) !== saved;

  function update(i: number, patch: Partial<Question>) {
    setItems((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  }

  async function move(i: number, d: -1 | 1) {
    const a = items[i];
    const b = items[i + d];
    if (!a || !b) return;
    setError(null);
    const { error: err } = await supabase.rpc("swap_question_positions", { q1: a.id, q2: b.id });
    if (err) {
      setError("Déplacement impossible : " + err.message);
      return;
    }
    const next = [...items];
    next[i] = { ...b, position: a.position };
    next[i + d] = { ...a, position: b.position };
    setItems(next);
    const savedArr: Question[] = JSON.parse(saved);
    const si = savedArr.findIndex((q) => q.id === a.id);
    const sj = savedArr.findIndex((q) => q.id === b.id);
    if (si >= 0 && sj >= 0) {
      const sa = savedArr[si];
      const sb = savedArr[sj];
      savedArr[si] = { ...sb, position: sa.position };
      savedArr[sj] = { ...sa, position: sb.position };
      setSaved(JSON.stringify(savedArr));
    }
  }

  async function publish() {
    setError(null);
    setState("saving");
    const before: Question[] = JSON.parse(saved);
    const changed = items.filter((q) => JSON.stringify(q) !== JSON.stringify(before.find((b) => b.id === q.id)));
    for (const q of changed) {
      const { error: err } = await supabase
        .from("questions")
        .update({ text: q.text, answer_type: q.answer_type, choices: q.choices, active: q.active })
        .eq("id", q.id);
      if (err) {
        setState("error");
        setError("Enregistrement impossible : " + err.message);
        return;
      }
    }
    setSaved(JSON.stringify(items));
    setState("done");
  }

  const active = items.filter((q) => q.active && q.text.trim());
  const secs = active.length * 15;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Questions de qualification</h1>
          <p className="text-sm leading-relaxed text-muted">Ce que le chat demande à l&apos;appelant après le SMS. Six emplacements : activez ceux dont vous avez besoin, dans l&apos;ordre que vous voulez.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[13px] font-semibold ${dirty ? "text-brand-dark" : "text-muted"}`}>
            {state === "saving" ? "Enregistrement…" : dirty ? "Modifications non publiées" : state === "done" ? "Publié · actif dès le prochain appel" : "À jour"}
          </span>
          <button type="button" onClick={publish} disabled={!dirty || state === "saving"} className="min-h-11 rounded-lg bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:bg-line disabled:text-muted">
            Publier
          </button>
        </div>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-urgent">{error}</p>}

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Emplacements de questions" className="min-w-0 flex-[999_1_560px] overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between px-5 py-3.5 text-[13px] font-bold text-muted">
            <span>
              {active.length} question{active.length > 1 ? "s" : ""} active{active.length > 1 ? "s" : ""} sur 6
            </span>
            <span>≈ {secs < 60 ? `${secs} s` : `${Math.floor(secs / 60)} min ${secs % 60 ? `${secs % 60} s` : ""}`} pour l&apos;appelant</span>
          </div>
          {items.map((q, i) => (
            <div key={q.id} className={`flex flex-wrap items-end gap-3.5 border-t border-[#EEF2F7] px-5 py-4 ${q.active ? "bg-white" : "bg-[#F8FAFC]"}`}>
              <span className={`mb-[7px] flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-[13px] font-extrabold ${q.active ? "bg-navy text-[#F5F7FB]" : "bg-line text-muted"}`}>{i + 1}</span>
              <label className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
                <span className="text-xs font-bold text-muted">Question {i + 1}</span>
                <input type="text" value={q.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Emplacement libre : écrivez une question" className="min-h-11 w-full rounded-lg border border-line-2 px-3 text-[15px] outline-brand" />
              </label>
              <label className="flex flex-[0_1_170px] flex-col gap-1.5">
                <span className="text-xs font-bold text-muted">Type de réponse</span>
                <select value={q.answer_type} onChange={(e) => update(i, { answer_type: e.target.value as AnswerType })} className="min-h-11 rounded-lg border border-line-2 bg-white px-2.5 text-sm outline-brand">
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={q.active} onChange={(e) => update(i, { active: e.target.checked })} className="h-5 w-5 accent-brand" />
                Active
              </label>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || dirty} aria-label={`Monter la question ${i + 1}`} title={dirty ? "Publiez d'abord vos modifications" : undefined} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-2 bg-white disabled:opacity-35">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1 || dirty} aria-label={`Descendre la question ${i + 1}`} title={dirty ? "Publiez d'abord vos modifications" : undefined} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-2 bg-white disabled:opacity-35">
                  ↓
                </button>
              </div>
              {q.answer_type === "choice" && (
                <label className="flex flex-[1_1_100%] flex-col gap-1.5 pl-11">
                  <span className="text-xs font-bold text-muted">Choix proposés (séparés par /)</span>
                  <input type="text" value={q.choices} onChange={(e) => update(i, { choices: e.target.value })} className="min-h-10 w-full rounded-lg border border-line-2 px-3 text-sm outline-brand" />
                </label>
              )}
            </div>
          ))}
        </section>

        <aside aria-label="Aperçu du chat" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Aperçu du chat</span>
          <p className="max-w-[88%] rounded-[14px_14px_14px_4px] bg-bg px-3.5 py-2.5 text-[13px] leading-relaxed">Bonjour ! Quelques questions rapides pour que {clientName} vous rappelle avec la bonne réponse.</p>
          {active.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <p className="max-w-[88%] rounded-[14px_14px_14px_4px] bg-bg px-3.5 py-2.5 text-[13px] leading-relaxed">{q.text}</p>
              <span className="max-w-[80%] self-end rounded-[14px_14px_4px_14px] border border-dashed border-line-2 px-3 py-2 text-xs font-semibold text-muted">
                {q.answer_type === "choice" ? q.choices || "Choix" : TYPES.find((t) => t.value === q.answer_type)?.hint}
              </span>
            </div>
          ))}
          <p className="max-w-[88%] rounded-[14px_14px_14px_4px] bg-navy px-3.5 py-2.5 text-[13px] leading-relaxed text-[#F5F7FB]">Merci, c&apos;est noté. On vous rappelle très vite.</p>
        </aside>
      </div>
    </div>
  );
}
