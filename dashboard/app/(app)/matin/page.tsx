import MorningBoard from "@/components/MorningBoard";
import { createClient } from "@/lib/supabase/server";
import type { Briefing, Call, Note } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MatinPage() {
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name, owner_first_name, avg_basket").limit(1).maybeSingle();
  if (!client) return <p className="text-muted">Aucun compte rattaché à cet utilisateur.</p>;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yStart = new Date(todayStart);
  yStart.setDate(yStart.getDate() - 1);

  const [{ data: briefing }, { data: yCalls }, { data: notes }, { data: priority }] = await Promise.all([
    supabase.from("briefings").select("id, briefing_date, summary, script, audio_url, stats, priority_call_id").eq("client_id", client.id).order("briefing_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("calls").select("id, status, is_landline, qualified_at, outcome").gte("called_at", yStart.toISOString()).lt("called_at", todayStart.toISOString()),
    supabase.from("notes").select("id, kind, body, audio_path, duration_s, status, category, created_at").eq("client_id", client.id).gte("created_at", yStart.toISOString()).order("created_at", { ascending: false }),
    supabase
      .from("calls")
      .select("id, caller_phone, besoin_court, summary, answers, urgent, score")
      .neq("status", "called_back")
      .not("qualified_at", "is", null)
      .order("urgent", { ascending: false })
      .order("score", { ascending: false, nullsFirst: false })
      .order("called_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const yc = (yCalls ?? []) as Pick<Call, "id" | "status" | "is_landline" | "qualified_at" | "outcome">[];
  const stats = {
    missed: yc.length,
    qualified: yc.filter((c) => c.qualified_at).length,
    landline: yc.filter((c) => c.is_landline && c.status !== "called_back").length,
    wonAmount: yc.filter((c) => c.outcome === "won").length * Number(client.avg_basket || 0),
    wonCount: yc.filter((c) => c.outcome === "won").length,
  };

  const allNotes = (notes ?? []) as Note[];
  return (
    <MorningBoard
      clientId={client.id}
      firstName={client.owner_first_name}
      briefing={(briefing ?? null) as Briefing | null}
      stats={stats}
      priority={(priority ?? null) as Pick<Call, "id" | "caller_phone" | "besoin_court" | "summary" | "urgent"> | null}
      yesterdayNotes={allNotes.filter((n) => new Date(n.created_at) < todayStart)}
      todayNotes={allNotes.filter((n) => new Date(n.created_at) >= todayStart)}
    />
  );
}
