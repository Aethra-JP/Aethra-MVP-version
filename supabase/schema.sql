-- Aethra database schema. Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- The vector size (1024) must match EMBED_DIM in the backend and the embedding model you choose.

create extension if not exists vector;

-- ---------- core tables ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  language text default 'en' check (language in ('en','hi','hinglish')),
  created_at timestamptz default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  business_type text,
  plan text not null default 'free',            -- free now; paid plans later
  created_at timestamptz default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  filename text,
  storage_path text not null,
  clean_path text,
  source_type text default 'generic',
  status text default 'ready',
  row_count int,
  period_label text,
  period_start date,
  period_end date,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.dataset_profiles (
  dataset_id uuid primary key references public.datasets(id) on delete cascade,
  columns jsonb, overview jsonb, roles jsonb, cleaning_log jsonb
);

create table if not exists public.periods (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  label text, start_date date, end_date date,
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  kind text, status text default 'running', error text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(), finished_at timestamptz
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  job_id uuid references public.analysis_jobs(id) on delete set null,
  kind text not null check (kind in ('descriptive','diagnostic','predictive','prescriptive')),
  result jsonb, narrative text, narrative_source text, language text default 'en',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.calculations (       -- audit trail: how every number was computed
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete cascade,
  calc_id text, label text, value jsonb, formula text,
  source_columns text[] default '{}', filters jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.model_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete cascade,
  target text, frequency text, model_name text, horizon int,
  forecast jsonb, metrics jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.model_comparisons (
  id uuid primary key default gen_random_uuid(),
  model_run_id uuid references public.model_runs(id) on delete cascade,
  ranking jsonb, recommended text, verdict text, warnings jsonb,
  created_at timestamptz default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  analysis_id uuid references public.analyses(id) on delete set null,
  title text not null, detail text,
  est_impact_inr numeric, impact_type text, assumption text,
  priority text default 'medium', due_date date,
  status text default 'suggested' check (status in ('suggested','in_progress','done','ignored')),
  baseline jsonb, outcome jsonb,
  created_at timestamptz default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  severity text default 'info', title text not null, detail text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  cadence text default 'monthly', enabled boolean default true, last_run timestamptz
);

create table if not exists public.seasonal_events (
  id uuid primary key default gen_random_uuid(),
  name text not null, months int[] not null, effect text
);

-- ---------- documents + embeddings ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null, storage_path text not null,
  status text default 'uploaded', chunk_count int default 0, error text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('workspace','memory','global')),
  workspace_id uuid references public.workspaces(id) on delete cascade,   -- null for global knowledge base
  document_id uuid references public.documents(id) on delete cascade,
  content text not null,
  embedding vector(1024),
  embed_model text,
  source_label text,
  created_at timestamptz default now()
);
create index if not exists document_chunks_embedding_idx on public.document_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists document_chunks_ws_idx on public.document_chunks (workspace_id, scope);

create or replace function public.match_chunks(
  query_embedding vector(1024), p_scope text, p_workspace uuid, p_model text, match_count int default 5)
returns table (id uuid, content text, document_id uuid, source_label text, similarity float)
language sql stable as $$
  select c.id, c.content, c.document_id, c.source_label, 1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.scope = p_scope and c.embed_model = p_model
    and (p_scope = 'global' or c.workspace_id = p_workspace)
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- chat ----------
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  dataset_id uuid references public.datasets(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text, created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text, meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- freemium plumbing ----------
create table if not exists public.feature_flags (
  key text primary key, enabled boolean default true, min_plan text default 'free', description text
);
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, workspace_id uuid, action text, tokens int default 0,
  created_at timestamptz default now()
);
create index if not exists usage_logs_user_day on public.usage_logs (user_id, action, created_at);

-- ---------- new users get a profile ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- row level security ----------
create or replace function public.is_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspace_members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_profiles enable row level security;
alter table public.periods enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.analyses enable row level security;
alter table public.calculations enable row level security;
alter table public.model_runs enable row level security;
alter table public.model_comparisons enable row level security;
alter table public.actions enable row level security;
alter table public.alerts enable row level security;
alter table public.report_schedules enable row level security;
alter table public.seasonal_events enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.feature_flags enable row level security;
alter table public.usage_logs enable row level security;   -- no policies: backend (service role) only

-- The browser only READS through RLS. All writes go through the backend with the service-role key.
create policy "own profile read" on public.profiles for select using (id = auth.uid());
create policy "own profile update" on public.profiles for update using (id = auth.uid());
create policy "members read workspace" on public.workspaces for select using (public.is_member(id));
create policy "members read membership" on public.workspace_members for select using (user_id = auth.uid() or public.is_member(workspace_id));

do $$
declare t text;
begin
  foreach t in array array['datasets','periods','analysis_jobs','analyses','calculations','model_runs','actions','alerts',
                           'report_schedules','documents','chat_sessions'] loop
    execute format('create policy "members read" on public.%I for select using (public.is_member(workspace_id))', t);
  end loop;
end $$;

create policy "members read profile rows" on public.dataset_profiles for select
  using (exists (select 1 from public.datasets d where d.id = dataset_id and public.is_member(d.workspace_id)));
create policy "members read comparisons" on public.model_comparisons for select
  using (exists (select 1 from public.model_runs r where r.id = model_run_id and public.is_member(r.workspace_id)));
create policy "own chat messages" on public.chat_messages for select
  using (exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "own chat sessions" on public.chat_sessions for select using (user_id = auth.uid());
create policy "chunks read" on public.document_chunks for select
  using (scope = 'global' or public.is_member(workspace_id));
create policy "events read" on public.seasonal_events for select using (auth.role() = 'authenticated');
create policy "flags read" on public.feature_flags for select using (auth.role() = 'authenticated');

-- ---------- storage buckets (private) ----------
insert into storage.buckets (id, name, public) values ('datasets', 'datasets', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

-- files must live under a folder named after the workspace id: <workspace_id>/<file>
create policy "members upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('datasets','documents') and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "members read files" on storage.objects for select to authenticated
  using (bucket_id in ('datasets','documents') and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "members delete files" on storage.objects for delete to authenticated
  using (bucket_id in ('datasets','documents') and public.is_member(((storage.foldername(name))[1])::uuid));

-- ---------- seed data ----------
insert into public.feature_flags (key, enabled, min_plan, description) values
  ('analysis_descriptive', true, 'free', 'Descriptive analysis'),
  ('analysis_diagnostic', true, 'free', 'Diagnostic analysis'),
  ('analysis_prescriptive', true, 'free', 'Prescriptive analysis and actions'),
  ('predictive_model_picker', true, 'free', 'Choose your own forecast model (candidate for a paid plan later)'),
  ('predictive_model_recommendation', true, 'free', 'Best-model recommendation (candidate for a paid plan later)'),
  ('embeddings', true, 'free', 'Document search and memory'),
  ('chat', true, 'free', 'Chat with your data')
on conflict (key) do nothing;

insert into public.seasonal_events (name, months, effect) values
  ('Diwali and festive season', '{10,11}', 'Gifting, sweets, decor and apparel usually rise'),
  ('Winter wedding season', '{11,12,1,2}', 'Apparel, jewellery, catering and gifting demand'),
  ('Holi', '{3}', 'Colours, sweets and party goods'),
  ('Financial year end', '{3}', 'Business buyers clear budgets and invoices'),
  ('Raksha Bandhan', '{8}', 'Gifts and sweets'),
  ('Ganesh Chaturthi', '{9}', 'Decor, sweets and puja items in many regions'),
  ('Summer season', '{4,5,6}', 'Cooling products, beverages and travel')
on conflict do nothing;
