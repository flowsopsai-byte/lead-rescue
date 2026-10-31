export type CallStatus = "missed" | "sms_sent" | "chat_open" | "qualified" | "called_back" | "landline";
export type Outcome = "quote" | "won" | "lost";

export type Answer = { q: string; a: string };

export type Call = {
  id: string;
  caller_phone: string;
  is_landline: boolean;
  status: CallStatus;
  urgent: boolean;
  answers: Answer[];
  summary: string | null;
  besoin_court: string | null;
  action: string | null;
  score: number | null;
  hubspot_contact_id: string | null;
  called_at: string;
  sms_sent_at: string | null;
  relance_sent_at: string | null;
  qualified_at: string | null;
  called_back_at: string | null;
  outcome: Outcome | null;
  outcome_at?: string | null;
};

export type Client = {
  id: string;
  name: string;
  rescue_number: string | null;
  avg_basket: number;
  hubspot_portal_id: string | null;
  owner_first_name: string | null;
};
