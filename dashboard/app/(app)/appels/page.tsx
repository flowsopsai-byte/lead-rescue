import CallsBoard from "@/components/CallsBoard";
import { createClient } from "@/lib/supabase/server";
import type { Call, Client } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppelsPage() {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: client }, { data: calls }] = await Promise.all([
    supabase.from("clients").select("id, name, rescue_number, avg_basket, hubspot_portal_id, owner_first_name").limit(1).maybeSingle(),
    supabase
      .from("calls")
      .select("id, caller_phone, is_landline, status, urgent, answers, summary, besoin_court, action, score, hubspot_contact_id, called_at, sms_sent_at, relance_sent_at, qualified_at, called_back_at, outcome")
      .gte("called_at", monthStart.toISOString())
      .order("called_at", { ascending: false })
      .limit(500),
  ]);

  if (!client) {
    return <p className="text-muted">Aucun compte rattaché à cet utilisateur.</p>;
  }

  return <CallsBoard client={client as Client} initialCalls={(calls ?? []) as Call[]} />;
}
