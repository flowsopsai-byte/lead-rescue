import QuestionsEditor from "@/components/QuestionsEditor";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name").limit(1).maybeSingle();
  if (!client) return <p className="text-muted">Aucun compte rattaché à cet utilisateur.</p>;
  const { data } = await supabase
    .from("questions")
    .select("id, position, text, answer_type, choices, active")
    .eq("client_id", client.id)
    .order("position");
  return <QuestionsEditor clientName={client.name} initial={(data ?? []) as Question[]} />;
}
