create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;

create type public.archive_kind as enum ('book', 'film', 'cp');
create type public.mailbox_role as enum ('owner', 'guest');
create type public.letter_status as enum ('pending', 'visible', 'rejected', 'deleted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '无名访客' check (char_length(display_name) between 1 and 32),
  avatar_symbol text not null default '🪶',
  avatar_color text not null default '#7d383d' check (avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind public.archive_kind not null,
  legacy_id text,
  title text not null check (char_length(title) between 1 and 160),
  event_date date,
  rating numeric(2,1) check (rating between 0 and 5),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, legacy_id)
);

create table public.archive_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  source_id uuid not null references public.archive_entries(id) on delete cascade,
  target_id uuid not null references public.archive_entries(id) on delete cascade,
  label text not null default '关联' check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  check (source_id <> target_id),
  unique (source_id, target_id, label)
);

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  reactions_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);

create table public.mailbox_members (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.mailbox_role not null default 'guest',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  is_active boolean not null default true,
  unique (mailbox_id, user_id)
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.letters(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  letter_type text not null default 'letter' check (letter_type in ('letter', 'recommendation', 'mood', 'anniversary')),
  status public.letter_status not null default 'visible',
  is_pinned boolean not null default false,
  mood_stamp text check (mood_stamp is null or mood_stamp in ('star', 'moon', 'feather', 'book', 'candle', 'echo')),
  attachment jsonb check (attachment is null or jsonb_typeof(attachment) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.letter_reactions (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('star', 'moon', 'feather', 'book', 'candle', 'echo')),
  created_at timestamptz not null default now(),
  unique (letter_id, user_id, reaction)
);

create table public.mailbox_read_states (
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  last_read_letter_id uuid references public.letters(id) on delete set null,
  primary key (mailbox_id, user_id)
);

create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  message text not null check (char_length(message) between 1 and 4000),
  opens_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index archive_entries_owner_kind_date_idx on public.archive_entries(owner_id, kind, event_date desc);
create index archive_entries_payload_gin_idx on public.archive_entries using gin(payload jsonb_path_ops);
create index archive_links_owner_id_idx on public.archive_links(owner_id);
create index archive_links_target_id_idx on public.archive_links(target_id);
create index mailbox_members_user_id_idx on public.mailbox_members(user_id);
create index letters_mailbox_created_idx on public.letters(mailbox_id, created_at desc) where deleted_at is null;
create index letters_author_id_idx on public.letters(author_id);
create index letters_parent_id_idx on public.letters(parent_id) where parent_id is not null;
create index letter_reactions_user_id_idx on public.letter_reactions(user_id);
create index mailbox_read_states_user_id_idx on public.mailbox_read_states(user_id);
create index mailbox_read_states_last_letter_idx on public.mailbox_read_states(last_read_letter_id) where last_read_letter_id is not null;
create index time_capsules_owner_opens_idx on public.time_capsules(owner_id, opens_at);

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger archive_entries_touch_updated_at before update on public.archive_entries
for each row execute function private.touch_updated_at();
create trigger mailboxes_touch_updated_at before update on public.mailboxes
for each row execute function private.touch_updated_at();
create trigger letters_touch_updated_at before update on public.letters
for each row execute function private.touch_updated_at();

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), '无名访客'));
  return new;
end;
$$;

create trigger auth_user_created after insert on auth.users
for each row execute function private.create_profile_for_new_user();

create or replace function private.add_mailbox_owner_member()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.mailbox_members (mailbox_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger mailbox_owner_member_created after insert on public.mailboxes
for each row execute function private.add_mailbox_owner_member();

create or replace function private.is_mailbox_member(target_mailbox uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.mailbox_members
    where mailbox_id = target_mailbox
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function private.is_mailbox_owner(target_mailbox uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.mailboxes
    where id = target_mailbox and owner_id = (select auth.uid())
  );
$$;

revoke execute on function private.touch_updated_at() from public, anon, authenticated;
revoke execute on function private.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function private.add_mailbox_owner_member() from public, anon, authenticated;
revoke execute on function private.is_mailbox_member(uuid) from public, anon;
revoke execute on function private.is_mailbox_owner(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_mailbox_member(uuid) to authenticated;
grant execute on function private.is_mailbox_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.archive_entries enable row level security;
alter table public.archive_links enable row level security;
alter table public.mailboxes enable row level security;
alter table public.mailbox_members enable row level security;
alter table public.letters enable row level security;
alter table public.letter_reactions enable row level security;
alter table public.mailbox_read_states enable row level security;
alter table public.time_capsules enable row level security;

create policy "profiles read own or mailbox peers" on public.profiles for select to authenticated
using (
  id = (select auth.uid()) or exists (
    select 1 from public.mailbox_members mine
    join public.mailbox_members peer on peer.mailbox_id = mine.mailbox_id
    where mine.user_id = (select auth.uid()) and peer.user_id = profiles.id and mine.is_active and peer.is_active
  )
);
create policy "profiles update own" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "archive entries owner all" on public.archive_entries for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "archive links owner all" on public.archive_links for all to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.archive_entries where id = source_id and owner_id = (select auth.uid()))
  and exists (select 1 from public.archive_entries where id = target_id and owner_id = (select auth.uid()))
);
create policy "capsules owner all" on public.time_capsules for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "mailboxes visible to members" on public.mailboxes for select to authenticated
using (owner_id = (select auth.uid()) or (select private.is_mailbox_member(id)));
create policy "mailboxes owner insert" on public.mailboxes for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy "mailboxes owner update" on public.mailboxes for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "mailboxes owner delete" on public.mailboxes for delete to authenticated
using (owner_id = (select auth.uid()));

create policy "members visible to mailbox peers" on public.mailbox_members for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_mailbox_member(mailbox_id)) or (select private.is_mailbox_owner(mailbox_id)));
create policy "mailbox owner inserts members" on public.mailbox_members for insert to authenticated
with check ((select private.is_mailbox_owner(mailbox_id)));
create policy "mailbox owner updates members" on public.mailbox_members for update to authenticated
using ((select private.is_mailbox_owner(mailbox_id)))
with check ((select private.is_mailbox_owner(mailbox_id)));
create policy "mailbox owner deletes members" on public.mailbox_members for delete to authenticated
using ((select private.is_mailbox_owner(mailbox_id)));

create policy "letters visible to members" on public.letters for select to authenticated
using (
  (select private.is_mailbox_member(mailbox_id))
  and (status = 'visible' or author_id = (select auth.uid()) or (select private.is_mailbox_owner(mailbox_id)))
);
create policy "members create own letters" on public.letters for insert to authenticated
with check (author_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id)));
create policy "authors or owner update letters" on public.letters for update to authenticated
using (author_id = (select auth.uid()) or (select private.is_mailbox_owner(mailbox_id)))
with check (author_id = (select auth.uid()) or (select private.is_mailbox_owner(mailbox_id)));

create policy "reactions visible to members" on public.letter_reactions for select to authenticated
using (exists (
  select 1 from public.letters
  where letters.id = letter_id and (select private.is_mailbox_member(letters.mailbox_id))
));
create policy "members insert own reactions" on public.letter_reactions for insert to authenticated
with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.letters
    where letters.id = letter_id and (select private.is_mailbox_member(letters.mailbox_id))
  )
);
create policy "members delete own reactions" on public.letter_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "members read own read state" on public.mailbox_read_states for select to authenticated
using (user_id = (select auth.uid()));
create policy "members insert own read state" on public.mailbox_read_states for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id)));
create policy "members update own read state" on public.mailbox_read_states for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id)));

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.archive_entries, public.archive_links, public.mailboxes, public.mailbox_members, public.time_capsules to authenticated;
grant select, insert, update on public.letters to authenticated;
grant select, insert, delete on public.letter_reactions to authenticated;
grant select, insert, update on public.mailbox_read_states to authenticated;

alter publication supabase_realtime add table public.letters;
alter publication supabase_realtime add table public.letter_reactions;
