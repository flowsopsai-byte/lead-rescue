"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Call, Client, Outcome } from "@/lib/types";

const STATUS: Record<string, { label: string; cls: string }> = {
  missed: { label: "SMS en cours", cls: "bg-line text-[#334155]" },
  sms_sent: { label: "SMS envoyé", cls: "bg-line text-[#334155]" },
  chat_open: { label: "Chat ouvert", cls: "bg-[#E0F2FE] text-[#075985]" },
  qualified: { label: "Qualifié", cls: "bg-brand-soft text-brand-dark" },
  called_back: { label: "Rappelé", cls: "bg-[#DFF0E8] text-[#1D5B43]" },
  landline: { label: "Fixe · à rappeler", cls: "bg-navy text-[#F5F7FB]" },
};

const OUTCOMES: { key: Outcome; label: string; on: string }[] = [
  { key: "quote", label: "Devis envoyé", on: "bg-[#E0F2FE] text-[#075985] border-[#075985]" },
  { key: "won", label: "Gagné", on: "bg-[#DFF0E8] text-[#1D5B43] border-[#1D5B43]" },
  { key: "lost", label: "Perdu", on: "bg-line text-[#334155] border-[#334155]" },
];

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "todo", label: "À rappeler" },
  { id: "qualified", label: "Qualifiés" },
  { id: "called_back", label: "Rappelés" },
] as const;

const PALIERS = [1000, 5000, 10000, 20000, 50000];

function euros(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
}

function formatPhone(p: string) {
  const fr = p.replace(/^\+33/, "0");
  return fr.length === 10 ? fr.replace(/(\d{2})(?=\d)/g, "$1 ") : p;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "auj.";
  if (d.toDateString() === yest.toDateString()) return "hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function Confetti() {
  const colors = ["#67E8F9", "#2563EB", "#4ADE80", "#DBEAFE", "#F5F7FB", "#06B6D4"];
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 42 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 h-3.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            width: `${6 + (i % 3) * 3}px`,
            background: colors[i % colors.length],
            animation: `lrfall 1.9s ease-in ${((i % 7) * 0.08).toFixed(2)}s forwards`,
          }}
        />
      ))}
      <div className="absolute top-24 left-1/2 whitespace-nowrap rounded-full bg-navy px-6 py-3.5 text-xl font-extrabold text-cyan shadow-2xl" style={{ animation: "lrpop 2.2s ease-out forwards" }}>
        Chantier gagné, bravo !
      </div>
    </div>
  );
}

export default function CallsBoard({ client, initialCalls }: { client: Client; initialCalls: Call[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [calls, setCalls] = useState<Call[]>(initialCalls);
  const [selId, setSelId] = useState<string | null>(initialCalls[0]?.id ?? null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [party, setParty] = useState(false);
  const [saving, setSaving] = useState(false);

  const match = (c: Call, f: string) =>
    f === "all" ? true : f === "todo" ? c.status !== "called_back" : f === "qualified" ? c.qualified_at !== null : c.status === f;

  const list = calls.filter((c) => match(c, filter));
  const sel = calls.find((c) => c.id === selId) ?? null;

  const qualified = calls.filter((c) => c.qualified_at).length;
  const delays = calls.filter((c) => c.sms_sent_at).map((c) => (new Date(c.sms_sent_at!).getTime() - new Date(c.called_at).getTime()) / 1000);
  const avgDelay = delays.length ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : null;
  const won = calls.filter((c) => c.outcome === "won").length;
  const amount = won * Number(client.avg_basket || 0);
  const next = PALIERS.find((p) => p > amount) ?? amount;
  const prev = [...PALIERS].reverse().find((p) => p <= amount) ?? 0;
  const pct = next > prev ? Math.round(((amount - prev) / (next - prev)) * 100) : 100;

  async function patch(id: string, values: Partial<Call>) {
    setSaving(true);
    const before = calls;
    setCalls((cs) => cs.map((c) => (c.id === id ? { ...c, ...values } : c)));
    const { error } = await supabase.from("calls").update(values).eq("id", id);
    setSaving(false);
    if (error) {
      setCalls(before);
      alert("Enregistrement impossible : " + error.message);
    }
  }

  function markCalledBack(c: Call) {
    patch(c.id, { status: "called_back", called_back_at: new Date().toISOString() });
  }

  function setOutcome(c: Call, o: Outcome) {
    const value = c.outcome === o ? null : o;
    const values: Partial<Call> = { outcome: value, outcome_at: value ? new Date().toISOString() : null };
    if (c.status !== "called_back") {
      values.status = "called_back";
      values.called_back_at = new Date().toISOString();
    }
    patch(c.id, values);
    if (value === "won" && c.outcome !== "won") {
      setParty(true);
      setTimeout(() => setParty(false), 2300);
    }
  }

  const crmUrl = (c: Call) =>
    client.hubspot_portal_id && c.hubspot_contact_id ? `https://app.hubspot.com/contacts/${client.hubspot_portal_id}/record/0-1/${c.hubspot_contact_id}` : null;

  const monthName = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Appels manqués</h1>
          <span className="text-sm text-muted first-letter:uppercase">{monthName}</span>
        </div>
        <div role="group" aria-label="Filtrer les appels" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.id)}
                className={`min-h-10 rounded-full border border-line-2 px-3.5 text-[13px] font-bold ${on ? "bg-navy text-[#F5F7FB]" : "bg-white text-navy"}`}
              >
                {f.label} · {calls.filter((c) => match(c, f.id)).length}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Kpi label="Appels manqués" value={String(calls.length)} sub="Ce mois-ci" />
        <Kpi label="Leads qualifiés" value={String(qualified)} sub={calls.length ? `${Math.round((qualified / calls.length) * 100)} % des appels` : "—"} />
        <Kpi label="Délai de réponse moyen" value={avgDelay !== null ? `${avgDelay} s` : "—"} sub="Entre l'appel et le SMS" />
        <div className="flex flex-col gap-1.5 rounded-xl bg-navy p-5 text-[#F5F7FB]">
          <span className="text-[13px] font-semibold text-[#CBD5E1]">Argent sauvé ce mois</span>
          <span className="text-[34px] font-extrabold tracking-tight text-cyan tabular-nums">{euros(amount)}</span>
          <span className="text-[13px] text-[#CBD5E1]">
            {won} chantier{won > 1 ? "s" : ""} gagné{won > 1 ? "s" : ""} × {euros(Number(client.avg_basket || 0))}
          </span>
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-navy-2">
              <div className="h-1.5 rounded-full bg-cyan transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-[#CBD5E1]">Prochain palier : {euros(next)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Liste des appels" className="min-w-0 flex-[999_1_520px] overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between px-4 py-3.5 text-[13px] font-bold text-muted">
            <span>Ce mois-ci</span>
            <span>{list.length} appel{list.length > 1 ? "s" : ""}</span>
          </div>
          {list.length === 0 && <p className="border-t border-[#EEF2F7] px-4 py-8 text-sm text-muted">Aucun appel dans ce filtre.</p>}
          {list.map((c) => {
            const st = STATUS[c.status];
            const isSel = c.id === selId;
            const out = OUTCOMES.find((o) => o.key === c.outcome);
            return (
              <div key={c.id} className={`flex flex-wrap items-center gap-3 border-t border-[#EEF2F7] px-4 py-3 ${isSel ? "bg-[#EFF6FF]" : "bg-white"}`}>
                <button type="button" aria-pressed={isSel} onClick={() => setSelId(c.id)} className="flex min-h-11 min-w-0 flex-[1_1_300px] items-start gap-3.5 py-1 text-left">
                  <span className="flex w-14 flex-none flex-col gap-0.5 font-mono text-[13px]">
                    <span>{timeLabel(c.called_at)}</span>
                    <span className="text-[11px] text-muted">{dayLabel(c.called_at)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-bold">{c.besoin_court || formatPhone(c.caller_phone)}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      {out && <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${out.on}`}>{out.label}</span>}
                      {c.urgent && c.status !== "called_back" && <span className="rounded-full bg-urgent px-2.5 py-0.5 text-xs font-extrabold text-white">Urgent</span>}
                    </span>
                    <span className="truncate text-sm text-muted">{c.summary || formatPhone(c.caller_phone)}</span>
                  </span>
                </button>
                {crmUrl(c) && (
                  <a href={crmUrl(c)!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line-2 px-3 text-[13px] font-bold whitespace-nowrap text-navy">
                    Fiche CRM ↗
                  </a>
                )}
              </div>
            );
          })}
        </section>

        <aside aria-label="Détail de l'appel" className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-xl border border-line bg-white p-6">
          {!sel ? (
            <p className="text-sm text-muted">Sélectionnez un appel pour voir le détail.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[22px] font-extrabold tracking-tight">{sel.besoin_court || "Appel manqué"}</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[sel.status].cls}`}>{STATUS[sel.status].label}</span>
                </div>
                <span className="font-mono text-[13px]">{formatPhone(sel.caller_phone)}</span>
                <span className="text-[13px] text-muted">
                  Appel le {new Date(sel.called_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  {sel.score ? ` · score ${sel.score}/5` : ""}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {crmUrl(sel) && (
                  <a href={crmUrl(sel)!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-navy px-4 text-sm font-bold text-white">
                    Ouvrir la fiche CRM ↗
                  </a>
                )}
                <a href={`tel:${sel.caller_phone}`} className="inline-flex min-h-11 items-center rounded-lg border border-line-2 px-4 text-sm font-bold text-navy">
                  Rappeler
                </a>
                {sel.status !== "called_back" ? (
                  <button type="button" disabled={saving} onClick={() => markCalledBack(sel)} className="min-h-11 rounded-lg bg-brand-soft px-4 text-sm font-bold text-brand-dark">
                    Marquer rappelé
                  </button>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-[13px] font-semibold text-[#1D5B43]">Rappelé · relance coupée</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Issue de l&apos;appel</span>
                <div role="group" aria-label="Issue de l'appel" className="flex flex-wrap gap-2">
                  {OUTCOMES.map((o) => {
                    const on = sel.outcome === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        disabled={saving}
                        aria-pressed={on}
                        onClick={() => setOutcome(sel, o.key)}
                        className={`min-h-11 rounded-lg border px-4 text-sm font-bold ${on ? o.on : "border-line-2 bg-white text-navy"}`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sel.summary && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Résumé IA</span>
                  <p className="rounded-lg bg-bg p-3.5 text-sm leading-relaxed">{sel.summary}</p>
                  {sel.action && <p className="text-sm font-semibold">➜ {sel.action}</p>}
                </div>
              )}

              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-extrabold tracking-wider text-muted uppercase">Réponses au chat</span>
                {sel.answers?.length ? (
                  sel.answers.map((qa, i) => (
                    <div key={i} className="flex flex-col gap-0.5 border-b border-[#EEF2F7] pb-3">
                      <span className="text-[13px] font-semibold text-muted">{qa.q}</span>
                      <span className="text-sm font-semibold">{qa.a || "—"}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted">{sel.is_landline ? "Pas de chat : l'appelant est sur une ligne fixe." : "Le prospect n'a pas encore répondu."}</span>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {party && <Confetti />}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-white p-5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className="text-[34px] font-extrabold tracking-tight tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{sub}</span>
    </div>
  );
}
