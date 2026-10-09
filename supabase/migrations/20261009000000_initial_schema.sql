-- Scriptura: initial schema.
--
-- Security model (the lessons from the previous platform):
--   * Gamification (XP, streak, quests, achievements) is NEVER writable by the
--     client. The Next.js server computes it with the shared rules engine and
--     persists it through `commit_progress`, which only `service_role` may call.
--   * Clients may only update the profile columns explicitly granted below
--     (column-level privileges), so plan/role/trial fields can't be self-edited.
--   * Every table has RLS enabled; policies are owner-only unless stated.

-- ───────────────────────────── profiles ─────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default 'Peregrino' check (char_length(display_name) between 1 and 60),
  companion_id  text not null default 'timoteo' check (companion_id in ('timoteo', 'ester', 'davi', 'moises', 'noe')),
  avatar_url    text,
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  plan_expires_at timestamptz,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Only these columns are client-editable. plan / is_admin stay server-controlled.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, companion_id, avatar_url) on public.profiles to authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Peregrino')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────── progress ─────────────────────────────
-- One row per player with the whole rules-engine state (see src/domain/progression/state.ts).
create table public.user_progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  xp         integer not null default 0 check (xp >= 0),
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

create index user_progress_xp_idx on public.user_progress (xp desc);

alter table public.user_progress enable row level security;

create policy "user_progress: read own" on public.user_progress
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.user_progress from anon, authenticated;

-- Append-only XP ledger. The unique key is the idempotency guarantee:
-- the same chapter/day, quiz session or favorite can never pay twice.
create table public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null,
  type       text not null,
  xp         integer not null check (xp >= 0),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create index xp_events_user_created_idx on public.xp_events (user_id, created_at desc);

alter table public.xp_events enable row level security;

create policy "xp_events: read own" on public.xp_events
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.xp_events from anon, authenticated;

-- Atomically records an event and the resulting state.
-- Returns 'ok' or 'duplicate'; raises SQLSTATE 40001 on a version conflict
-- (a concurrent update) so the caller reloads and retries.
create function public.commit_progress(
  p_user_id uuid,
  p_expected_version integer,
  p_state jsonb,
  p_xp integer,
  p_event_key text,
  p_event_type text,
  p_event_xp integer,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.xp_events (user_id, key, type, xp, payload)
  values (p_user_id, p_event_key, p_event_type, p_event_xp, coalesce(p_payload, '{}'::jsonb))
  on conflict (user_id, key) do nothing;

  if not found then
    return 'duplicate';
  end if;

  insert into public.user_progress as up (user_id, state, xp, version)
  values (p_user_id, p_state, p_xp, 1)
  on conflict (user_id) do update
    set state = excluded.state,
        xp = excluded.xp,
        version = up.version + 1,
        updated_at = now()
    where up.version = p_expected_version;

  if not found then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  return 'ok';
end;
$$;

revoke execute on function public.commit_progress from public, anon, authenticated;
grant execute on function public.commit_progress to service_role;

-- ───────────────────────────── annotations ─────────────────────────────
-- Highlights, favorites and notes, keyed by verse (`jo.3.16`). Pure user
-- content: no XP here (XP goes through the server), so the client may write it.
create table public.verse_annotations (
  user_id    uuid not null references auth.users (id) on delete cascade,
  verse      text not null check (verse ~ '^[0-9a-z]{2,4}\.[0-9]{1,3}\.[0-9]{1,3}$'),
  highlight  text check (highlight in ('ouro', 'oliva', 'ceu', 'rosa', 'lavanda')),
  favorite   boolean not null default false,
  note       text check (char_length(note) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, verse)
);

alter table public.verse_annotations enable row level security;

create policy "verse_annotations: read own" on public.verse_annotations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "verse_annotations: insert own" on public.verse_annotations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "verse_annotations: update own" on public.verse_annotations
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "verse_annotations: delete own" on public.verse_annotations
  for delete to authenticated using (user_id = (select auth.uid()));

-- ───────────────────────────── mentor (AI) ─────────────────────────────
create table public.mentor_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null check (char_length(content) <= 20000),
  created_at timestamptz not null default now()
);

create index mentor_messages_user_created_idx on public.mentor_messages (user_id, created_at desc);

alter table public.mentor_messages enable row level security;

create policy "mentor_messages: read own" on public.mentor_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "mentor_messages: delete own" on public.mentor_messages
  for delete to authenticated using (user_id = (select auth.uid()));

revoke insert, update on public.mentor_messages from anon, authenticated;

-- Daily AI quota, enforced on the server before calling the model.
create table public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null,
  messages integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage: read own" on public.ai_usage
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.ai_usage from anon, authenticated;

-- Consumes one message of today's quota. Returns false when the limit is reached.
create function public.consume_ai_quota(p_user_id uuid, p_day date, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  used integer;
begin
  insert into public.ai_usage as u (user_id, day, messages)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day) do update set messages = u.messages + 1
    where u.messages < p_limit
  returning messages into used;

  return used is not null;
end;
$$;

revoke execute on function public.consume_ai_quota from public, anon, authenticated;
grant execute on function public.consume_ai_quota to service_role;

-- ───────────────────────────── housekeeping ─────────────────────────────
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger verse_annotations_touch before update on public.verse_annotations
  for each row execute function public.touch_updated_at();
