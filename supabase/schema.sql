-- Lead Rescue — Supabase schema
-- Multi-tenant: one row per client in `clients`, every other table scoped by client_id with RLS.
-- n8n writes with the service_role key (bypasses RLS); the dashboard reads with the anon key + user auth.

create extension if not exists pgcrypto;

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  public_phone text,
  rescue_number text unique,
  sms_template text not null default 'Bonjour, {entreprise} n''a pas pu décrocher. Décrivez votre besoin ici, on vous rappelle vite : {lien}',
  voice_message text not null default 'Bonjour, vous êtes bien chez {entreprise}. Nous ne pouvons pas décrocher pour le moment. Vous allez recevoir un SMS dans quelques secondes pour nous décrire votre besoin. Nous vous rappelons très vite.',
  voice_id text,
  audio_url text,
  relance_enabled boolean not null default true,
  avg_basket numeric not null default 0,
  hubspot_portal_id text,
  notify_email text,
  created_at timestamptz not null default now()
);

-- DASHBOARD USER <-> CLIENT
create table public.client_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  primary key (user_id, client_id)
);

-- CALLS
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  caller_phone text not null,
  is_landline boolean not null default false,
  status text not null default 'missed'
    check (status in ('missed','sms_sent','chat_open','qualified','called_back','landline')),
  urgent boolean not null default false,
  token text not null unique default encode(gen_random_bytes(6), 'hex'),
  answers jsonb not null default '[]'::jsonb,
  summary text,
  hubspot_contact_id text,
  called_at timestamptz not null default now(),
  sms_sent_at timestamptz,
  relance_sent_at timestamptz,
  chat_opened_at timestamptz,
  qualified_at timestamptz,
  called_back_at timestamptz
);
create index calls_client_date_idx on public.calls (client_id, called_at desc);

-- QUALIFICATION QUESTIONS (6 fixed slots per client)
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  text text not null default '',
  answer_type text not null default 'text'
    check (answer_type in ('text','choice','address','slot','photo')),
  choices text not null default '',
  active boolean not null default false,
  constraint questions_client_position_key unique (client_id, position) deferrable initially immediate
);

-- Seed 6 default questions when a client is created
create or replace function public.seed_default_questions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.questions (client_id, position, text, answer_type, choices, active) values
    (new.id, 1, 'Pouvez-vous décrire votre besoin en quelques mots ?', 'text', '', true),
    (new.id, 2, 'Est-ce urgent ?', 'choice', 'Oui, aujourd''hui / Cette semaine / Pas pressé', true),
    (new.id, 3, 'Quelle est l''adresse de l''intervention ?', 'address', '', true),
    (new.id, 4, 'Quand pouvons-nous vous rappeler ?', 'slot', '', true),
    (new.id, 5, '', 'text', '', false),
    (new.id, 6, '', 'text', '', false);
  return new;
end $$;

create trigger trg_seed_questions
after insert on public.clients
for each row execute function public.seed_default_questions();

-- Swap two question positions (up/down arrows in the dashboard)
create or replace function public.swap_question_positions(q1 uuid, q2 uuid)
returns void language plpgsql security invoker as $$
declare p1 smallint; p2 smallint;
begin
  select position into p1 from public.questions where id = q1;
  select position into p2 from public.questions where id = q2;
  update public.questions
    set position = case when id = q1 then p2 else p1 end
    where id in (q1, q2);
end $$;

-- MONTHLY STATS (dashboard KPI row)
create or replace view public.monthly_stats with (security_invoker = true) as
select
  c.client_id,
  date_trunc('month', c.called_at) as month,
  count(*) as missed_calls,
  count(*) filter (where c.qualified_at is not null) as qualified,
  count(*) filter (where c.status = 'called_back') as called_back,
  round(avg(extract(epoch from (c.sms_sent_at - c.called_at)))) as avg_sms_delay_s,
  count(*) filter (where c.status = 'called_back') * max(cl.avg_basket) as revenue_estimate
from public.calls c
join public.clients cl on cl.id = c.client_id
group by c.client_id, date_trunc('month', c.called_at);

-- ROW LEVEL SECURITY: each client only sees its own data
alter table public.clients enable row level security;
alter table public.client_users enable row level security;
alter table public.calls enable row level security;
alter table public.questions enable row level security;

create or replace function public.my_client_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from public.client_users where user_id = auth.uid()
$$;

create policy "own membership" on public.client_users for select using (user_id = auth.uid());
create policy "own client read" on public.clients for select using (id in (select public.my_client_ids()));
create policy "own client update" on public.clients for update using (id in (select public.my_client_ids()));
create policy "own calls read" on public.calls for select using (client_id in (select public.my_client_ids()));
create policy "own calls update" on public.calls for update using (client_id in (select public.my_client_ids()));
create policy "own questions read" on public.questions for select using (client_id in (select public.my_client_ids()));
create policy "own questions update" on public.questions for update using (client_id in (select public.my_client_ids()));

-- Clients can only edit their settings, never their number or IDs
revoke update on public.clients from authenticated;
grant update (sms_template, voice_message, voice_id, relance_enabled, avg_basket) on public.clients to authenticated;
revoke update on public.calls from authenticated;
grant update (status, called_back_at) on public.calls to authenticated;

-- AI qualification fields (added with WF2)
alter table public.calls
  add column score smallint,
  add column besoin_court text,
  add column action text;
