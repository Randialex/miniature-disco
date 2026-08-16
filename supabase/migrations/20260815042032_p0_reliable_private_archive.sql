-- P0: reliable sync, archive roles/invitations, optimistic conflicts,
-- daily backups, 30-day trash, and restorable version history.

create type public.archive_member_role as enum ('owner', 'editor', 'viewer');

create table public.archive_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null default '私人记忆档案馆' check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_members (
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.archive_member_role not null,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true,
  primary key (archive_id, user_id),
  check (role <> 'owner' or is_active)
);

create table public.archive_invitations (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  role public.archive_member_role not null check (role in ('editor', 'viewer')),
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (accepted_at is null or accepted_by is not null)
);

insert into public.archive_spaces (owner_id, name)
select id, display_name || '的私人记忆档案馆'
from public.profiles
on conflict (owner_id) do nothing;

insert into public.archive_members (archive_id, user_id, role)
select id, owner_id, 'owner'::public.archive_member_role
from public.archive_spaces
on conflict (archive_id, user_id) do update
set role = 'owner', is_active = true;

alter table public.archive_entries
  add column archive_id uuid references public.archive_spaces(id) on delete cascade,
  add column revision bigint not null default 1 check (revision > 0),
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete set null,
  add column updated_by uuid references public.profiles(id) on delete set null;

update public.archive_entries entries
set archive_id = spaces.id,
    legacy_id = coalesce(entries.legacy_id, entries.id::text),
    updated_by = entries.owner_id
from public.archive_spaces spaces
where spaces.owner_id = entries.owner_id;

alter table public.archive_entries
  alter column archive_id set not null,
  alter column legacy_id set not null;

alter table public.archive_entries
  drop constraint archive_entries_owner_id_kind_legacy_id_key;

alter table public.archive_entries
  add constraint archive_entries_archive_id_kind_legacy_id_key
  unique (archive_id, kind, legacy_id);

create table public.archive_entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  revision bigint not null,
  kind public.archive_kind not null,
  legacy_id text not null,
  title text not null,
  event_date date,
  rating numeric(2,1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  deleted_at timestamptz,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  unique (entry_id, revision)
);

create table public.archive_sync_operations (
  operation_id uuid primary key,
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  result jsonb not null,
  applied_at timestamptz not null default now()
);

create table public.archive_backups (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  snapshot_date date not null default current_date,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'array'),
  entry_count integer not null default 0 check (entry_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (archive_id, snapshot_date)
);

create index archive_members_user_active_idx
  on public.archive_members (user_id, archive_id) where is_active;
create index archive_invitations_archive_created_idx
  on public.archive_invitations (archive_id, created_at desc);
create index archive_invitations_expiry_idx
  on public.archive_invitations (expires_at) where revoked_at is null and accepted_at is null;
create index archive_entries_archive_active_idx
  on public.archive_entries (archive_id, kind, updated_at desc) where deleted_at is null;
create index archive_entries_archive_trash_idx
  on public.archive_entries (archive_id, deleted_at desc) where deleted_at is not null;
create index archive_entries_deleted_by_idx
  on public.archive_entries (deleted_by) where deleted_by is not null;
create index archive_entries_updated_by_idx
  on public.archive_entries (updated_by) where updated_by is not null;
create index archive_entry_versions_archive_changed_idx
  on public.archive_entry_versions (archive_id, changed_at desc);
create index archive_entry_versions_changed_by_idx
  on public.archive_entry_versions (changed_by) where changed_by is not null;
create index archive_sync_operations_archive_applied_idx
  on public.archive_sync_operations (archive_id, applied_at desc);
create index archive_sync_operations_user_idx
  on public.archive_sync_operations (user_id);
create index archive_backups_archive_date_idx
  on public.archive_backups (archive_id, snapshot_date desc);
create index archive_backups_created_by_idx
  on public.archive_backups (created_by) where created_by is not null;

create trigger archive_spaces_touch_updated_at before update on public.archive_spaces
for each row execute function private.touch_updated_at();

create or replace function private.archive_role_for(target_archive uuid)
returns public.archive_member_role
language sql stable security definer set search_path = '' as $$
  select members.role
  from public.archive_members members
  where members.archive_id = target_archive
    and members.user_id = (select auth.uid())
    and members.is_active
  limit 1;
$$;

create or replace function private.can_read_archive(target_archive uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
    and (select private.archive_role_for(target_archive)) is not null;
$$;

create or replace function private.can_write_archive(target_archive uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select private.archive_role_for(target_archive)) in ('owner', 'editor');
$$;

create or replace function private.is_archive_owner(target_archive uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select (select private.archive_role_for(target_archive)) = 'owner';
$$;

create or replace function private.version_archive_entry()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.revision = old.revision + 1;
    new.updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger archive_entries_touch_updated_at on public.archive_entries;
create trigger archive_entries_version_before_update
before update on public.archive_entries
for each row execute function private.version_archive_entry();

create or replace function private.record_archive_entry_version()
returns trigger language plpgsql set search_path = '' as $$
begin
  insert into public.archive_entry_versions (
    entry_id, archive_id, revision, kind, legacy_id, title, event_date,
    rating, payload, deleted_at, changed_by, changed_at
  ) values (
    new.id, new.archive_id, new.revision, new.kind, new.legacy_id, new.title,
    new.event_date, new.rating, new.payload, new.deleted_at,
    new.updated_by, new.updated_at
  );
  return new;
end;
$$;

create trigger archive_entries_record_version
after insert or update on public.archive_entries
for each row execute function private.record_archive_entry_version();

insert into public.archive_entry_versions (
  entry_id, archive_id, revision, kind, legacy_id, title, event_date,
  rating, payload, deleted_at, changed_by, changed_at
)
select id, archive_id, revision, kind, legacy_id, title, event_date,
       rating, payload, deleted_at, updated_by, updated_at
from public.archive_entries
on conflict (entry_id, revision) do nothing;

create or replace function private.write_daily_archive_backup(
  target_archive uuid,
  actor uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  archive_snapshot jsonb;
  archive_count integer;
begin
  select coalesce(jsonb_agg(to_jsonb(entries) order by entries.kind, entries.legacy_id), '[]'::jsonb),
         count(*)::integer
    into archive_snapshot, archive_count
  from public.archive_entries entries
  where entries.archive_id = target_archive;

  insert into public.archive_backups (
    archive_id, snapshot_date, snapshot, entry_count, created_by, created_at
  ) values (
    target_archive, current_date, archive_snapshot, archive_count, actor, now()
  )
  on conflict (archive_id, snapshot_date) do update
  set snapshot = excluded.snapshot,
      entry_count = excluded.entry_count,
      created_by = excluded.created_by,
      created_at = now();
end;
$$;

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  new_archive_id uuid;
  new_display_name text;
begin
  new_display_name := coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), '无名访客');

  insert into public.profiles (id, display_name)
  values (new.id, new_display_name);

  insert into public.archive_spaces (owner_id, name)
  values (new.id, new_display_name || '的私人记忆档案馆')
  returning id into new_archive_id;

  insert into public.archive_members (archive_id, user_id, role)
  values (new_archive_id, new.id, 'owner');

  return new;
end;
$$;

create or replace function public.ensure_personal_archive()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  target public.archive_spaces%rowtype;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into target from public.archive_spaces where owner_id = actor;
  if not found then
    insert into public.archive_spaces (owner_id, name)
    select actor, profiles.display_name || '的私人记忆档案馆'
    from public.profiles profiles where profiles.id = actor
    returning * into target;

    insert into public.archive_members (archive_id, user_id, role)
    values (target.id, actor, 'owner')
    on conflict (archive_id, user_id) do update set role = 'owner', is_active = true;
  end if;

  return to_jsonb(target);
end;
$$;

create or replace function public.create_archive_invitation(
  p_archive_id uuid,
  p_role public.archive_member_role,
  p_expires_in_hours integer default 168
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  raw_token text;
  invitation public.archive_invitations%rowtype;
begin
  if actor is null or not (select private.is_archive_owner(p_archive_id)) then
    raise exception 'archive_owner_required' using errcode = '42501';
  end if;
  if p_role not in ('editor', 'viewer') then
    raise exception 'invalid_invitation_role' using errcode = '22023';
  end if;
  if p_expires_in_hours < 1 or p_expires_in_hours > 720 then
    raise exception 'invalid_invitation_expiry' using errcode = '22023';
  end if;

  raw_token := encode(gen_random_bytes(24), 'hex');
  insert into public.archive_invitations (
    archive_id, invited_by, role, token_hash, expires_at
  ) values (
    p_archive_id, actor, p_role, digest(raw_token, 'sha256'),
    now() + make_interval(hours => p_expires_in_hours)
  ) returning * into invitation;

  return jsonb_build_object(
    'id', invitation.id,
    'token', raw_token,
    'role', invitation.role,
    'expires_at', invitation.expires_at
  );
end;
$$;

create or replace function public.accept_archive_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  invitation public.archive_invitations%rowtype;
  archive_name text;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_token is null or char_length(p_token) <> 48 then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;

  select * into invitation
  from public.archive_invitations
  where token_hash = digest(p_token, 'sha256')
  for update;

  if not found or invitation.revoked_at is not null
     or invitation.accepted_at is not null or invitation.expires_at <= now() then
    raise exception 'invitation_unavailable' using errcode = '22023';
  end if;

  insert into public.archive_members (archive_id, user_id, role, is_active)
  values (invitation.archive_id, actor, invitation.role, true)
  on conflict (archive_id, user_id) do update
  set role = excluded.role,
      is_active = true,
      joined_at = now();

  update public.archive_invitations
  set accepted_at = now(), accepted_by = actor
  where id = invitation.id;

  select name into archive_name from public.archive_spaces where id = invitation.archive_id;
  return jsonb_build_object(
    'archive_id', invitation.archive_id,
    'archive_name', archive_name,
    'role', invitation.role
  );
end;
$$;

create or replace function public.revoke_archive_invitation(p_invitation_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  update public.archive_invitations invitations
  set revoked_at = now()
  where invitations.id = p_invitation_id
    and invitations.accepted_at is null
    and invitations.revoked_at is null
    and (select private.is_archive_owner(invitations.archive_id));
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.update_archive_member_role(
  p_archive_id uuid,
  p_user_id uuid,
  p_role public.archive_member_role,
  p_is_active boolean default true
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  affected integer;
begin
  if not (select private.is_archive_owner(p_archive_id)) then
    raise exception 'archive_owner_required' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) or p_role = 'owner' then
    raise exception 'owner_membership_is_immutable' using errcode = '22023';
  end if;

  update public.archive_members members
  set role = p_role, is_active = p_is_active
  where members.archive_id = p_archive_id
    and members.user_id = p_user_id
    and members.role <> 'owner';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.apply_archive_entry_mutation(
  p_operation_id uuid,
  p_archive_id uuid,
  p_kind public.archive_kind,
  p_legacy_id text,
  p_title text,
  p_event_date date,
  p_rating numeric,
  p_payload jsonb,
  p_base_revision bigint,
  p_deleted boolean default false
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  archive_owner uuid;
  current_entry public.archive_entries%rowtype;
  response jsonb;
  previous_operation public.archive_sync_operations%rowtype;
begin
  if actor is null or not (select private.can_write_archive(p_archive_id)) then
    raise exception 'archive_write_forbidden' using errcode = '42501';
  end if;
  if p_legacy_id is null or char_length(p_legacy_id) = 0 or char_length(p_legacy_id) > 200 then
    raise exception 'invalid_legacy_id' using errcode = '22023';
  end if;

  select * into previous_operation
  from public.archive_sync_operations operations
  where operations.operation_id = p_operation_id;
  if found then
    if previous_operation.user_id <> actor or previous_operation.archive_id <> p_archive_id then
      raise exception 'operation_id_collision' using errcode = '22023';
    end if;
    return previous_operation.result;
  end if;

  select * into current_entry
  from public.archive_entries entries
  where entries.archive_id = p_archive_id
    and entries.kind = p_kind
    and entries.legacy_id = p_legacy_id
  for update;

  if found and current_entry.revision <> p_base_revision then
    response := jsonb_build_object(
      'status', 'conflict',
      'entry', to_jsonb(current_entry)
    );
  elsif not found and p_base_revision <> 0 then
    response := jsonb_build_object('status', 'conflict', 'entry', null);
  elsif not found and p_deleted then
    response := jsonb_build_object('status', 'applied', 'entry', null);
  elsif not found then
    select spaces.owner_id into archive_owner
    from public.archive_spaces spaces where spaces.id = p_archive_id;

    insert into public.archive_entries (
      archive_id, owner_id, kind, legacy_id, title, event_date, rating,
      payload, deleted_at, deleted_by, updated_by
    ) values (
      p_archive_id, archive_owner, p_kind, p_legacy_id, p_title, p_event_date,
      p_rating, p_payload, null, null, actor
    ) returning * into current_entry;
    response := jsonb_build_object('status', 'applied', 'entry', to_jsonb(current_entry));
  else
    update public.archive_entries entries
    set title = p_title,
        event_date = p_event_date,
        rating = p_rating,
        payload = p_payload,
        deleted_at = case when p_deleted then now() else null end,
        deleted_by = case when p_deleted then actor else null end,
        updated_by = actor
    where entries.id = current_entry.id
    returning * into current_entry;
    response := jsonb_build_object('status', 'applied', 'entry', to_jsonb(current_entry));
  end if;

  insert into public.archive_sync_operations (operation_id, archive_id, user_id, result)
  values (p_operation_id, p_archive_id, actor, response);

  if response ->> 'status' = 'applied' then
    delete from public.archive_entries entries
    where entries.archive_id = p_archive_id
      and entries.deleted_at < now() - interval '30 days';
    perform private.write_daily_archive_backup(p_archive_id, actor);
  end if;

  return response;
end;
$$;

create or replace function public.restore_archive_entry_version(p_version_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  version_row public.archive_entry_versions%rowtype;
  restored public.archive_entries%rowtype;
begin
  select * into version_row
  from public.archive_entry_versions versions
  where versions.id = p_version_id;

  if not found or actor is null
     or not (select private.can_write_archive(version_row.archive_id)) then
    raise exception 'archive_write_forbidden' using errcode = '42501';
  end if;

  update public.archive_entries entries
  set title = version_row.title,
      event_date = version_row.event_date,
      rating = version_row.rating,
      payload = version_row.payload,
      deleted_at = null,
      deleted_by = null,
      updated_by = actor
  where entries.id = version_row.entry_id
  returning * into restored;

  if not found then
    raise exception 'archive_entry_no_longer_available' using errcode = 'P0002';
  end if;

  perform private.write_daily_archive_backup(version_row.archive_id, actor);
  return to_jsonb(restored);
end;
$$;

create or replace function public.maintain_archive(p_archive_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  purged integer := 0;
begin
  if actor is null or not (select private.can_write_archive(p_archive_id)) then
    raise exception 'archive_write_forbidden' using errcode = '42501';
  end if;

  delete from public.archive_entries entries
  where entries.archive_id = p_archive_id
    and entries.deleted_at < now() - interval '30 days';
  get diagnostics purged = row_count;
  perform private.write_daily_archive_backup(p_archive_id, actor);

  delete from public.archive_sync_operations operations
  where operations.archive_id = p_archive_id
    and operations.applied_at < now() - interval '90 days';

  return jsonb_build_object('purged', purged, 'backed_up_at', now());
end;
$$;

create or replace function public.restore_archive_backup(p_backup_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  backup_row public.archive_backups%rowtype;
  archive_owner uuid;
  item jsonb;
  restored_count integer := 0;
begin
  select * into backup_row from public.archive_backups backups where backups.id = p_backup_id;
  if not found or actor is null
     or not (select private.is_archive_owner(backup_row.archive_id)) then
    raise exception 'archive_owner_required' using errcode = '42501';
  end if;

  select owner_id into archive_owner
  from public.archive_spaces where id = backup_row.archive_id;

  update public.archive_entries
  set deleted_at = now(), deleted_by = actor, updated_by = actor
  where archive_id = backup_row.archive_id and deleted_at is null;

  for item in select value from jsonb_array_elements(backup_row.snapshot)
  loop
    insert into public.archive_entries (
      archive_id, owner_id, kind, legacy_id, title, event_date, rating,
      payload, deleted_at, deleted_by, updated_by
    ) values (
      backup_row.archive_id,
      archive_owner,
      (item ->> 'kind')::public.archive_kind,
      item ->> 'legacy_id',
      item ->> 'title',
      nullif(item ->> 'event_date', '')::date,
      nullif(item ->> 'rating', '')::numeric,
      item -> 'payload',
      nullif(item ->> 'deleted_at', '')::timestamptz,
      case when item ->> 'deleted_at' is null then null else actor end,
      actor
    )
    on conflict (archive_id, kind, legacy_id) do update
    set title = excluded.title,
        event_date = excluded.event_date,
        rating = excluded.rating,
        payload = excluded.payload,
        deleted_at = excluded.deleted_at,
        deleted_by = excluded.deleted_by,
        updated_by = actor;
    restored_count := restored_count + 1;
  end loop;

  perform private.write_daily_archive_backup(backup_row.archive_id, actor);
  return restored_count;
end;
$$;

revoke execute on function private.archive_role_for(uuid) from public, anon;
revoke execute on function private.can_read_archive(uuid) from public, anon;
revoke execute on function private.can_write_archive(uuid) from public, anon;
revoke execute on function private.is_archive_owner(uuid) from public, anon;
revoke execute on function private.version_archive_entry() from public, anon, authenticated;
revoke execute on function private.record_archive_entry_version() from public, anon, authenticated;
revoke execute on function private.write_daily_archive_backup(uuid, uuid) from public, anon, authenticated;

grant execute on function private.archive_role_for(uuid) to authenticated;
grant execute on function private.can_read_archive(uuid) to authenticated;
grant execute on function private.can_write_archive(uuid) to authenticated;
grant execute on function private.is_archive_owner(uuid) to authenticated;

revoke execute on function public.ensure_personal_archive() from public, anon;
revoke execute on function public.create_archive_invitation(uuid, public.archive_member_role, integer) from public, anon;
revoke execute on function public.accept_archive_invitation(text) from public, anon;
revoke execute on function public.revoke_archive_invitation(uuid) from public, anon;
revoke execute on function public.update_archive_member_role(uuid, uuid, public.archive_member_role, boolean) from public, anon;
revoke execute on function public.apply_archive_entry_mutation(uuid, uuid, public.archive_kind, text, text, date, numeric, jsonb, bigint, boolean) from public, anon;
revoke execute on function public.restore_archive_entry_version(uuid) from public, anon;
revoke execute on function public.maintain_archive(uuid) from public, anon;
revoke execute on function public.restore_archive_backup(uuid) from public, anon;

grant execute on function public.ensure_personal_archive() to authenticated;
grant execute on function public.create_archive_invitation(uuid, public.archive_member_role, integer) to authenticated;
grant execute on function public.accept_archive_invitation(text) to authenticated;
grant execute on function public.revoke_archive_invitation(uuid) to authenticated;
grant execute on function public.update_archive_member_role(uuid, uuid, public.archive_member_role, boolean) to authenticated;
grant execute on function public.apply_archive_entry_mutation(uuid, uuid, public.archive_kind, text, text, date, numeric, jsonb, bigint, boolean) to authenticated;
grant execute on function public.restore_archive_entry_version(uuid) to authenticated;
grant execute on function public.maintain_archive(uuid) to authenticated;
grant execute on function public.restore_archive_backup(uuid) to authenticated;

alter table public.archive_spaces enable row level security;
alter table public.archive_members enable row level security;
alter table public.archive_invitations enable row level security;
alter table public.archive_entry_versions enable row level security;
alter table public.archive_sync_operations enable row level security;
alter table public.archive_backups enable row level security;

create policy "archive spaces visible to members"
on public.archive_spaces for select to authenticated
using ((select private.can_read_archive(id)));
create policy "archive owners update spaces"
on public.archive_spaces for update to authenticated
using ((select private.is_archive_owner(id)))
with check ((select private.is_archive_owner(id)));

create policy "archive members visible to peers"
on public.archive_members for select to authenticated
using ((select private.can_read_archive(archive_id)));

create policy "archive invitations visible to owners"
on public.archive_invitations for select to authenticated
using ((select private.is_archive_owner(archive_id)));

create policy "archive versions visible to members"
on public.archive_entry_versions for select to authenticated
using ((select private.can_read_archive(archive_id)));

create policy "archive backups visible to owners"
on public.archive_backups for select to authenticated
using ((select private.is_archive_owner(archive_id)));

drop policy "archive entries owner all" on public.archive_entries;
create policy "archive entries visible to members"
on public.archive_entries for select to authenticated
using ((select private.can_read_archive(archive_id)));

drop policy "profiles read own or mailbox peers" on public.profiles;
create policy "profiles read own or shared peers"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.mailbox_members mine
    join public.mailbox_members peer on peer.mailbox_id = mine.mailbox_id
    where mine.user_id = (select auth.uid())
      and peer.user_id = profiles.id
      and mine.is_active and peer.is_active
  )
  or exists (
    select 1
    from public.archive_members mine
    join public.archive_members peer on peer.archive_id = mine.archive_id
    where mine.user_id = (select auth.uid())
      and peer.user_id = profiles.id
      and mine.is_active and peer.is_active
  )
);

revoke insert, update, delete on public.archive_entries from authenticated;
grant select on public.archive_entries to authenticated;
grant select, update on public.archive_spaces to authenticated;
grant select on public.archive_members, public.archive_invitations,
  public.archive_entry_versions, public.archive_backups to authenticated;
revoke all on public.archive_sync_operations from authenticated, anon;

comment on table public.archive_spaces is 'Private archive tenancy boundary.';
comment on table public.archive_entry_versions is 'Immutable history; every archive entry revision is recorded.';
comment on table public.archive_backups is 'Automatic daily snapshots, refreshed after successful mutations.';
comment on column public.archive_entries.deleted_at is 'Soft deletion timestamp; entries are retained for at least 30 days.';
