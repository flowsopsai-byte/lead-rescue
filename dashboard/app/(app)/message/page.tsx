import MessageEditor from "@/components/MessageEditor";
import { createClient } from "@/lib/supabase/server";
import type { ClientSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MessagePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, sms_template, voice_message, voice_id, audio_url, relance_enabled")
    .limit(1)
    .maybeSingle();
  if (!data) return <p className="text-muted">Aucun compte rattaché à cet utilisateur.</p>;
  return <MessageEditor initial={data as ClientSettings} />;
}
