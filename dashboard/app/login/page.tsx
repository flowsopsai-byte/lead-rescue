"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FlowsOpsMark, LeadRescueMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/appels");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2.5">
          <LeadRescueMark />
          <span className="text-lg font-extrabold">Lead Rescue</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight">Connexion</h1>
          <p className="text-sm text-muted">Accédez à vos appels manqués récupérés.</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-11 rounded-lg border border-line-2 px-3 text-[15px] outline-brand" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold">Mot de passe</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-11 rounded-lg border border-line-2 px-3 text-[15px] outline-brand" />
        </label>
        {error && <p className="text-sm font-semibold text-urgent">{error}</p>}
        <button type="submit" disabled={loading} className="min-h-11 rounded-lg bg-brand font-extrabold text-white hover:bg-brand-dark disabled:opacity-60">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
        <div className="flex items-center gap-2 border-t border-line pt-4">
          <span className="rounded-[7px] bg-navy p-0.5"><FlowsOpsMark /></span>
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] text-muted">Propulsé par</span>
            <span className="bg-gradient-to-r from-[#2563EB] to-[#06B6D4] bg-clip-text text-sm font-extrabold whitespace-nowrap text-transparent">FlowsOps AI</span>
          </span>
        </div>
      </form>
    </div>
  );
}
