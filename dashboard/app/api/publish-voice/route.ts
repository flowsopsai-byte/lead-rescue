import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { data: client } = await supabase.from("clients").select("id").limit(1).maybeSingle();
  if (!client) return NextResponse.json({ error: "Aucun compte rattaché" }, { status: 403 });

  const url = process.env.N8N_PUBLISH_VOICE_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return NextResponse.json({ error: "Publication non configurée" }, { status: 500 });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-lead-rescue-secret": secret },
    body: JSON.stringify({ client_id: client.id }),
  });
  if (!res.ok) return NextResponse.json({ error: "La génération de la voix a échoué" }, { status: 502 });

  const { data: updated } = await supabase.from("clients").select("audio_url").eq("id", client.id).maybeSingle();
  return NextResponse.json({ ok: true, audio_url: updated?.audio_url ?? null });
}
