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

export type ClientSettings = {
  id: string;
  name: string;
  sms_template: string;
  voice_message: string;
  voice_id: string | null;
  audio_url: string | null;
  relance_enabled: boolean;
};

export type AnswerType = "text" | "choice" | "address" | "slot" | "photo";

export type Question = {
  id: string;
  position: number;
  text: string;
  answer_type: AnswerType;
  choices: string;
  active: boolean;
};

export type Note = {
  id: string;
  kind: "voice" | "text";
  body: string | null;
  audio_path: string | null;
  duration_s: number | null;
  status: "pending" | "ready" | "failed";
  category: "call_back" | "order" | "todo" | "other" | null;
  created_at: string;
};

export type Briefing = {
  id: string;
  briefing_date: string;
  summary: string | null;
  script: string | null;
  audio_url: string | null;
  stats: Record<string, number>;
  priority_call_id: string | null;
};
