create extension if not exists pgcrypto;

create type public.mailbox_role as enum ('owner', 'guest');
create type public.moderation_mode as enum ('none', 'first', 'all');
create type public.letter_status as enum ('pending', 'visible', 'rejected', 'deleted');
create type public.letter_type as enum ('letter', 'recommendation', 'mood', 'anniversary');
create type public.reaction_type as enum ('star', 'moon', 'feather', 'book', 'candle', 'echo');

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  name text not null default '拾染randi与友人的猫头鹰邮局' check (char_length(name) between 1 and 80),
  owner_id uuid not null references auth.users(id) on delete restrict,
  max_members smallint not null default 2 check (max_members = 2),
  moderation_mode public.moderation_mode not null default 'first',
  reactions_enabled boolean not null default true,
  presence_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.mailbox_members (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.mailbox_role not null,
  display_name text not null check (char_length(display_name) between 2 and 16),
  avatar_symbol text not null default '🪶' check (char_length(avatar_symbol) between 1 and 8),
  avatar_color text not null default '#7a1f1f' check (avatar_color ~ '^#[0-9a-fA-F]{6}$'),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  is_active boolean not null default true,
  first_letter_approved boolean not null default false,
  unique (mailbox_id, user_id),
  unique (mailbox_id, role)
);

create table public.mailbox_invites (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  code_hash text not null,
  allowed_email_hash text,
  allowed_email_hint text,
  expires_at timestamptz not null,
  max_uses smallint not null default 1 check (max_uses = 1),
  used_count smallint not null default 0 check (used_count between 0 and 1),
  used_by uuid references auth.users(id),
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null default false
);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.letters(id) on delete set null,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  letter_type public.letter_type not null default 'letter',
  status public.letter_status not null default 'visible',
  is_pinned boolean not null default false,
  mood_stamp public.reaction_type,
  attachment jsonb check (attachment is null or jsonb_typeof(attachment) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.letter_reactions (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction public.reaction_type not null,
  created_at timestamptz not null default now(),
  unique (letter_id, user_id, reaction)
);

create table public.mailbox_read_state (
  mailbox_id uuid not null references public.mailboxes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  last_read_letter_id uuid references public.letters(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (mailbox_id, user_id)
);

create index mailbox_members_user_idx on public.mailbox_members(user_id, mailbox_id) where is_active;
create index letters_mailbox_created_idx on public.letters(mailbox_id, created_at desc);
create index letters_parent_idx on public.letters(parent_id) where parent_id is not null;
create index reactions_letter_idx on public.letter_reactions(letter_id);
create index invite_attempts_rate_idx on public.invite_attempts(user_id, attempted_at desc);

create schema if not exists private;

create or replace function private.is_mailbox_member(target_mailbox uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mailbox_members
    where mailbox_id = target_mailbox and user_id = (select auth.uid()) and is_active
  );
$$;

create or replace function private.is_mailbox_owner(target_mailbox uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.mailbox_members
    where mailbox_id = target_mailbox and user_id = (select auth.uid()) and role = 'owner' and is_active
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_mailbox_member(uuid), private.is_mailbox_owner(uuid) to authenticated;

create or replace function public.prepare_new_letter()
returns trigger language plpgsql security definer set search_path = '' as $$
declare member_role public.mailbox_role; mode public.moderation_mode; approved boolean;
begin
  if new.author_id <> (select auth.uid()) then raise exception 'author mismatch'; end if;
  select mm.role, mm.first_letter_approved, mb.moderation_mode into member_role, approved, mode
  from public.mailbox_members mm join public.mailboxes mb on mb.id = mm.mailbox_id
  where mm.mailbox_id = new.mailbox_id and mm.user_id = (select auth.uid()) and mm.is_active;
  if not found then raise exception 'not a mailbox member'; end if;
  if new.parent_id is not null and not exists (select 1 from public.letters where id = new.parent_id and mailbox_id = new.mailbox_id and parent_id is null) then raise exception 'invalid reply target'; end if;
  new.is_pinned := false;
  if member_role = 'owner' or mode = 'none' or (mode = 'first' and approved) then new.status := 'visible'; else new.status := 'pending'; end if;
  return new;
end;
$$;

create trigger prepare_new_letter_before_insert before insert on public.letters for each row execute function public.prepare_new_letter();

create or replace function public.touch_letter_updated_at()
returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger touch_letter_before_update before update on public.letters for each row execute function public.touch_letter_updated_at();

create or replace function public.protect_member_authorization_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.mailbox_id <> old.mailbox_id or new.user_id <> old.user_id or new.role <> old.role then
    raise exception 'member identity fields cannot be changed';
  end if;
  if (new.is_active <> old.is_active or new.first_letter_approved <> old.first_letter_approved)
    and not (select private.is_mailbox_owner(old.mailbox_id)) then
    raise exception 'member authorization fields cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_member_before_update before update on public.mailbox_members for each row execute function public.protect_member_authorization_fields();

create or replace function public.protect_letter_authorization_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.mailbox_id <> old.mailbox_id or new.author_id <> old.author_id or new.parent_id is distinct from old.parent_id then
    raise exception 'letter identity fields cannot be changed';
  end if;
  if (new.status <> old.status or new.is_pinned <> old.is_pinned)
    and not (select private.is_mailbox_owner(old.mailbox_id)) then
    raise exception 'letter moderation fields cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_letter_before_update before update on public.letters for each row execute function public.protect_letter_authorization_fields();

create or replace function public.protect_mailbox_identity_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id <> old.owner_id or new.max_members <> old.max_members then
    raise exception 'mailbox identity fields cannot be changed';
  end if;
  return new;
end;
$$;
create trigger protect_mailbox_before_update before update on public.mailboxes for each row execute function public.protect_mailbox_identity_fields();

create or replace function public.approve_first_guest_letter()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status = 'visible' then
    update public.mailbox_members set first_letter_approved = true
    where mailbox_id = new.mailbox_id and user_id = new.author_id and role = 'guest';
  end if;
  return new;
end;
$$;
create trigger approve_first_guest_after_update after update on public.letters for each row execute function public.approve_first_guest_letter();

create or replace function public.bootstrap_mailbox_owner(
  target_user uuid, mailbox_name text, owner_name text, owner_symbol text, owner_color text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare created_mailbox uuid;
begin
  if exists (select 1 from public.mailboxes) then raise exception 'mailbox already exists'; end if;
  insert into public.mailboxes(name, owner_id) values (mailbox_name, target_user) returning id into created_mailbox;
  insert into public.mailbox_members(mailbox_id,user_id,role,display_name,avatar_symbol,avatar_color,first_letter_approved)
  values (created_mailbox,target_user,'owner',owner_name,owner_symbol,owner_color,true);
  return created_mailbox;
end;
$$;

create or replace function public.redeem_mailbox_invite(
  target_user uuid, target_email_hash text, target_code_hash text,
  guest_name text, guest_symbol text, guest_color text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare invite_row public.mailbox_invites%rowtype; member_count integer;
begin
  select * into invite_row from public.mailbox_invites
  where code_hash = target_code_hash and revoked_at is null and used_at is null and used_count < max_uses and expires_at > now()
  for update;
  if not found then raise exception 'invalid or expired invitation'; end if;
  if invite_row.allowed_email_hash is not null and invite_row.allowed_email_hash <> target_email_hash then raise exception 'email does not match invitation'; end if;
  perform 1 from public.mailboxes where id=invite_row.mailbox_id for update;
  select count(*) into member_count from public.mailbox_members where mailbox_id=invite_row.mailbox_id and is_active;
  if member_count >= 2 then raise exception 'mailbox is full'; end if;
  insert into public.mailbox_members(mailbox_id,user_id,role,display_name,avatar_symbol,avatar_color)
  values (invite_row.mailbox_id,target_user,'guest',guest_name,guest_symbol,guest_color);
  update public.mailbox_invites set used_count=1,used_by=target_user,used_at=now() where id=invite_row.id;
  return invite_row.mailbox_id;
end;
$$;

alter table public.mailboxes enable row level security;
alter table public.mailbox_members enable row level security;
alter table public.mailbox_invites enable row level security;
alter table public.invite_attempts enable row level security;
alter table public.letters enable row level security;
alter table public.letter_reactions enable row level security;
alter table public.mailbox_read_state enable row level security;

-- Presence and typing indicators use a private channel named
-- mailbox:<mailbox_uuid>:presence. Realtime Authorization applies the same
-- two-member check as the database rows.
alter table realtime.messages enable row level security;
create policy "mailbox members can receive private realtime"
on realtime.messages for select to authenticated
using (
  extension in ('broadcast', 'presence')
  and realtime.topic() ~ '^mailbox:[0-9a-f-]{36}:presence$'
  and (select private.is_mailbox_member(split_part(realtime.topic(), ':', 2)::uuid))
);
create policy "mailbox members can send private realtime"
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast', 'presence')
  and realtime.topic() ~ '^mailbox:[0-9a-f-]{36}:presence$'
  and (select private.is_mailbox_member(split_part(realtime.topic(), ':', 2)::uuid))
);

create policy "members read mailbox" on public.mailboxes for select to authenticated using ((select private.is_mailbox_member(id)));
create policy "owner updates mailbox" on public.mailboxes for update to authenticated using ((select private.is_mailbox_owner(id))) with check ((select private.is_mailbox_owner(id)));
create policy "members read members" on public.mailbox_members for select to authenticated using ((select private.is_mailbox_member(mailbox_id)));
create policy "members update own profile" on public.mailbox_members for update to authenticated using (user_id = (select auth.uid()) and is_active) with check (user_id = (select auth.uid()) and is_active);
create policy "owner reads invite summaries" on public.mailbox_invites for select to authenticated using ((select private.is_mailbox_owner(mailbox_id)));

create policy "members read permitted letters" on public.letters for select to authenticated using (
  (select private.is_mailbox_member(mailbox_id)) and deleted_at is null and
  (status = 'visible' or author_id = (select auth.uid()) or (select private.is_mailbox_owner(mailbox_id)))
);
create policy "members insert letters" on public.letters for insert to authenticated with check (
  author_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id))
);
create policy "authors edit recent own letters" on public.letters for update to authenticated using (
  author_id = (select auth.uid()) and created_at > now() - interval '30 minutes' and deleted_at is null
) with check (author_id = (select auth.uid()));
create policy "owners moderate letters" on public.letters for update to authenticated using ((select private.is_mailbox_owner(mailbox_id))) with check ((select private.is_mailbox_owner(mailbox_id)));

create policy "members read reactions" on public.letter_reactions for select to authenticated using (
  exists (select 1 from public.letters l where l.id = letter_id and (select private.is_mailbox_member(l.mailbox_id)))
);
create policy "members add own reactions" on public.letter_reactions for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.letters l join public.mailboxes m on m.id=l.mailbox_id where l.id=letter_id and m.reactions_enabled and (select private.is_mailbox_member(l.mailbox_id)))
);
create policy "members remove own reactions" on public.letter_reactions for delete to authenticated using (user_id = (select auth.uid()));

create policy "members read own read state" on public.mailbox_read_state for select to authenticated using (user_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id)));
create policy "members add own read state" on public.mailbox_read_state for insert to authenticated with check (user_id = (select auth.uid()) and (select private.is_mailbox_member(mailbox_id)));
create policy "members update own read state" on public.mailbox_read_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.invite_attempts from anon, authenticated;
revoke all on public.mailbox_invites from anon;
grant select on public.mailboxes, public.mailbox_members, public.letters, public.letter_reactions, public.mailbox_read_state to authenticated;
grant insert on public.letters, public.letter_reactions, public.mailbox_read_state to authenticated;
grant update on public.mailboxes, public.mailbox_members, public.letters, public.mailbox_read_state to authenticated;
grant delete on public.letter_reactions to authenticated;
grant select on public.mailbox_invites to authenticated;
revoke all on function public.bootstrap_mailbox_owner(uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.redeem_mailbox_invite(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.bootstrap_mailbox_owner(uuid,text,text,text,text) to service_role;
grant execute on function public.redeem_mailbox_invite(uuid,text,text,text,text,text) to service_role;

alter publication supabase_realtime add table public.letters;
alter publication supabase_realtime add table public.letter_reactions;
alter publication supabase_realtime add table public.mailbox_read_state;

comment on table public.mailboxes is 'P3.6 private two-person owl post mailboxes';
