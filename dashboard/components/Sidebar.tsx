"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FlowsOpsMark, LeadRescueMark } from "./Logo";

const NAV = [
  { href: "/matin", label: "Ce matin", icon: "sun" },
  { href: "/appels", label: "Appels manqués", icon: "phone" },
  { href: "/message", label: "Message d'accueil", icon: "speaker" },
  { href: "/questions", label: "Questions", icon: "chat" },
] as const;

function Icon({ name }: { name: (typeof NAV)[number]["icon"] }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "sun")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (name === "phone")
    return (
      <svg {...common}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
        <path d="M16 2l6 6M22 2l-6 6" />
      </svg>
    );
  if (name === "speaker")
    return (
      <svg {...common}>
        <path d="M11 5L6 9H2v6h4l5 4V5z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function Sidebar({ clientName, rescueNumber, todoCount }: { clientName: string; rescueNumber: string | null; todoCount: number }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav aria-label="Navigation principale" className="flex flex-[1_1_220px] flex-col gap-7 bg-navy px-4 py-6 text-[#F5F7FB] lg:min-h-screen">
      <div className="flex items-center gap-2.5 px-2">
        <LeadRescueMark />
        <span className="text-[17px] font-extrabold tracking-tight">Lead Rescue</span>
      </div>

      <div className="flex flex-col gap-1 px-2">
        <span className="text-xs font-semibold text-[#94A3B8]">Compte</span>
        <span className="text-[15px] font-bold">{clientName}</span>
        {rescueNumber && (
          <span className="flex items-center gap-1.5 font-mono text-xs text-[#94A3B8]">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80]" />
            Ligne active · {rescueNumber}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm ${active ? "bg-navy-2 font-bold text-[#F5F7FB]" : "font-semibold text-[#CBD5E1] hover:bg-navy-2/60"}`}
            >
              <Icon name={item.icon} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/appels" && todoCount > 0 && (
                <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-extrabold text-white">{todoCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button type="button" onClick={signOut} className="min-h-11 rounded-lg px-3 text-left text-sm font-semibold text-[#CBD5E1] hover:bg-navy-2/60">
          Se déconnecter
        </button>
        <div className="flex items-center gap-2 border-t border-navy-2 px-2 pt-3">
          <FlowsOpsMark />
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] text-[#94A3B8]">Propulsé par</span>
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#22D3EE] bg-clip-text text-sm font-extrabold whitespace-nowrap text-transparent">FlowsOps AI</span>
          </span>
        </div>
      </div>
    </nav>
  );
}
