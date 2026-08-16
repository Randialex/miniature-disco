-- P3: let visitors enter the single explicitly opened archive through an
-- invisible Supabase anonymous session. Anonymous users still use the
-- authenticated Postgres role, so every read/write remains protected by RLS.

alter table public.archive_spaces
  add column visitor_access_enabled boolean not null default false;

-- This site exposes at most one archive as its public reading room.
create unique index archive_spaces_single_visitor_access_idx
  on public.archive_spaces (visitor_access_enabled)
  where visitor_access_enabled;

-- Preserve the expected one-owner/one-archive setup without accidentally
-- opening anything when the database already contains multiple archives.
do $$
begin
  if (select count(*) from public.archive_spaces) = 1 then
    update public.archive_spaces set visitor_access_enabled = true;
  end if;
end;
$$;

create or replace function public.enter_public_archive()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_archive uuid;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true' then
    raise exception 'anonymous_session_required' using errcode = '42501';
  end if;

  select spaces.id into target_archive
  from public.archive_spaces spaces
  where spaces.visitor_access_enabled
  limit 1;

  if target_archive is null then
    raise exception 'visitor_archive_not_enabled' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.archive_members members
    where members.archive_id = target_archive
      and members.user_id = actor
      and not members.is_active
  ) then
    raise exception 'visitor_access_revoked' using errcode = '42501';
  end if;

  insert into public.archive_members (archive_id, user_id, role, is_active)
  values (target_archive, actor, 'viewer', true)
  on conflict (archive_id, user_id) do nothing;

  return target_archive;
end;
$$;

revoke execute on function public.enter_public_archive() from public, anon;
grant execute on function public.enter_public_archive() to authenticated;

comment on column public.archive_spaces.visitor_access_enabled is
  'When true, anonymous Supabase users may join this archive as read-only viewers.';
comment on function public.enter_public_archive() is
  'Adds the current anonymous Auth user to the explicitly opened archive as a viewer.';
