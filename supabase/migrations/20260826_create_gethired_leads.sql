-- Isolated GetHired CRM. Do not reuse wine-club members.
create table if not exists public.gethired_leads (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  country_code text,
  full_name text,
  email_from_cv text,
  consent boolean not null default false,
  consented_at timestamptz,
  role_slug text,
  role_label text,
  score numeric,
  score_tier text,
  top_fixes text[] not null default '{}',
  journey_stage text not null default 'captured',
  source text not null default 'checker',
  wa_me_url text,
  email_notified_at timestamptz,
  builder_opened_at timestamptz,
  cv_edited_at timestamptz,
  exported_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gethired_leads_phone_unique unique (phone)
);

alter table public.gethired_leads enable row level security;

create table if not exists public.gethired_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.gethired_leads(id) on delete cascade,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.gethired_lead_events enable row level security;
