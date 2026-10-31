import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, name, rescue_number").limit(1).maybeSingle();
  const { count } = await supabase
    .from("calls")
    .select("id", { count: "exact", head: true })
    .neq("status", "called_back");

  return (
    <div className="flex min-h-screen flex-wrap">
      <Sidebar clientName={client?.name ?? "Mon entreprise"} rescueNumber={client?.rescue_number ?? null} todoCount={count ?? 0} />
      <main className="min-w-0 flex-[999_1_560px] px-5 py-8 sm:px-10">{children}</main>
    </div>
  );
}
