-- P2.1: Noctua Post, archive marginalia, reply notifications, and read state.
-- Existing /owl-post data remains valid; new columns are backfilled conservatively.

alter table public.mailboxes
  add column archive_id uuid references public.archive_spaces(id) on delete cascade;

update public.mailboxes mailboxes
set archive_id = spaces.id
from public.archive_spaces spaces
where spaces.owner_id = mailboxes.owner_id
  and mailboxes.archive_id is null;

alter table public.mailboxes alter column archive_id set not null;
create unique index mailboxes_archive_id_key on public.mailboxes (archive_id);

alter table public.letters
  add column archive_id uuid references public.archive_spaces(id) on delete cascade,
  add column entry_id uuid references public.archive_entries(id) on delete set null,
  add column session_id text,
  add column read_at timestamptz,
  add column edited_at timestamptz,
  add column visibility text not null default 'archive_members'
    check (visibility in ('archive_members', 'owner_only', 'participants')),
  add column workflow_status text not null default 'pending'
    check (workflow_status in ('pending', 'opened', 'replied', 'archived'));

alter table public.letters drop constraint letters_letter_type_check;
update public.letters
set letter_type = case letter_type
  when 'letter' then 'owner_note'
  when 'mood' then 'memory'
  when 'anniversary' then 'memory'
  else letter_type
end;
alter table public.letters add constraint letters_letter_type_check
  check (letter_type in ('owner_note', 'archive', 'recommendation', 'memory', 'private'));

update public.letters letters
set archive_id = mailboxes.archive_id,
    read_at = coalesce(letters.updated_at, letters.created_at),
    workflow_status = case
      when exists (select 1 from public.letters replies where replies.parent_id = letters.id) then 'replied'
      else 'opened'
    end
from public.mailboxes mailboxes
where mailboxes.id = letters.mailbox_id
  and letters.archive_id is null;

alter table public.letters alter column archive_id set not null;

create index letters_archive_created_idx
  on public.letters (archive_id, created_at desc) where deleted_at is null;
create index letters_entry_created_idx
  on public.letters (entry_id, created_at desc) where entry_id is not null and deleted_at is null;
create index letters_workflow_idx
  on public.letters (mailbox_id, workflow_status, created_at desc) where deleted_at is null;

create table public.archive_comments (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.archive_comments(id) on delete cascade,
  anchor_type text not null default 'entry'
    check (anchor_type in ('entry', 'quote', 'scene', 'session', 'reflection', 'note')),
  anchor_ref text,
  quoted_text text check (quoted_text is null or char_length(quoted_text) <= 1000),
  content text not null check (char_length(content) between 1 and 4000),
  visibility text not null default 'archive_members'
    check (visibility in ('archive_members', 'owner_only', 'participants')),
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.archive_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.archive_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null
    check (reaction in ('resonance', 'heartbreak', 'healed', 'rewatch', 'revelation', 'hug')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, reaction)
);

create table public.archive_notifications (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null
    check (event_type in ('new_letter', 'letter_reply', 'mention', 'archive_update', 'capsule_open')),
  letter_id uuid references public.letters(id) on delete cascade,
  comment_id uuid references public.archive_comments(id) on delete cascade,
  entry_id uuid references public.archive_entries(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (letter_id is not null or comment_id is not null or entry_id is not null or event_type = 'capsule_open')
);

create index archive_comments_entry_created_idx
  on public.archive_comments (entry_id, created_at desc) where deleted_at is null;
create index archive_comments_archive_author_idx
  on public.archive_comments (archive_id, author_id, created_at desc) where deleted_at is null;
create index archive_comments_parent_idx
  on public.archive_comments (parent_id, created_at) where parent_id is not null and deleted_at is null;
create index archive_comment_reactions_user_idx on public.archive_comment_reactions (user_id);
create index archive_notifications_recipient_unread_idx
  on public.archive_notifications (recipient_id, created_at desc) where read_at is null;
create index archive_notifications_archive_created_idx
  on public.archive_notifications (archive_id, created_at desc);
create unique index archive_notifications_letter_once_idx
  on public.archive_notifications (recipient_id, event_type, letter_id)
  where letter_id is not null;
create unique index archive_notifications_comment_once_idx
  on public.archive_notifications (recipient_id, event_type, comment_id)
  where comment_id is not null;

create trigger archive_comments_touch_updated_at before update on public.archive_comments
for each row execute function private.touch_updated_at();

create or replace function private.can_read_letter(target_letter uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.letters target
    join public.mailboxes mailbox on mailbox.id = target.mailbox_id
    where target.id = target_letter
      and target.deleted_at is null
      and (select private.is_mailbox_member(target.mailbox_id))
      and (
        target.status = 'visible'
        or target.author_id = (select auth.uid())
        or mailbox.owner_id = (select auth.uid())
      )
      and (
        target.author_id = (select auth.uid())
        or mailbox.owner_id = (select auth.uid())
        or (target.visibility = 'archive_members' and (select private.can_read_archive(target.archive_id)))
        or (
          target.visibility = 'participants'
          and exists (
            select 1 from public.letters participant
            where participant.mailbox_id = target.mailbox_id
              and participant.author_id = (select auth.uid())
              and participant.deleted_at is null
              and (
                participant.id = coalesce(target.parent_id, target.id)
                or participant.parent_id = coalesce(target.parent_id, target.id)
              )
          )
        )
      )
  );
$$;

create or replace function private.can_read_archive_comment(target_comment uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.archive_comments comments
    where comments.id = target_comment
      and comments.deleted_at is null
      and comments.status <> 'deleted'
      and (select private.can_read_archive(comments.archive_id))
      and (
        comments.status <> 'hidden'
        or comments.author_id = (select auth.uid())
        or (select private.is_archive_owner(comments.archive_id))
      )
      and (
        comments.visibility = 'archive_members'
        or comments.author_id = (select auth.uid())
        or (select private.is_archive_owner(comments.archive_id))
        or (
          comments.visibility = 'participants'
          and exists (
            select 1
            from public.archive_comments participant
            where participant.author_id = (select auth.uid())
              and participant.deleted_at is null
              and (
                participant.id = comments.parent_id
                or participant.parent_id = comments.id
                or (participant.parent_id is not null and participant.parent_id = comments.parent_id)
              )
          )
        )
      )
  );
$$;

create or replace function private.validate_archive_comment()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.archive_entries entries
    where entries.id = new.entry_id
      and entries.archive_id = new.archive_id
      and entries.deleted_at is null
  ) then
    raise exception 'archive_comment_entry_mismatch' using errcode = '23514';
  end if;

  if new.parent_id is not null and not exists (
    select 1 from public.archive_comments parent
    where parent.id = new.parent_id
      and parent.archive_id = new.archive_id
      and parent.entry_id = new.entry_id
      and parent.deleted_at is null
  ) then
    raise exception 'archive_comment_parent_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger archive_comments_validate before insert or update on public.archive_comments
for each row execute function private.validate_archive_comment();

create or replace function private.notify_letter_delivery()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  event_name text := case when new.parent_id is null then 'new_letter' else 'letter_reply' end;
  archive_title text;
begin
  select spaces.name into archive_title
  from public.archive_spaces spaces where spaces.id = new.archive_id;

  if new.parent_id is not null then
    update public.letters
    set workflow_status = 'replied'
    where id = new.parent_id and author_id <> new.author_id and workflow_status <> 'archived';
  end if;

  insert into public.archive_notifications (
    archive_id, recipient_id, actor_id, event_type, letter_id, entry_id, payload
  )
  select new.archive_id,
         members.user_id,
         new.author_id,
         event_name,
         new.id,
         new.entry_id,
         jsonb_build_object(
           'title', case when event_name = 'letter_reply' then '有人回复了我' else '收到一封新来信' end,
           'archive_title', coalesce(archive_title, '私人记忆档案馆'),
           'href', '/owl-post#letter-' || new.id
         )
  from public.mailbox_members members
  join public.mailboxes mailboxes on mailboxes.id = members.mailbox_id
  where members.mailbox_id = new.mailbox_id
    and members.is_active
    and members.user_id <> new.author_id
    and (new.visibility <> 'owner_only' or members.user_id = mailboxes.owner_id)
    and (
      new.visibility <> 'participants'
      or members.user_id = mailboxes.owner_id
      or exists (
        select 1 from public.letters participant
        where participant.mailbox_id = new.mailbox_id
          and participant.author_id = members.user_id
          and participant.deleted_at is null
          and (
            participant.id = coalesce(new.parent_id, new.id)
            or participant.parent_id = coalesce(new.parent_id, new.id)
          )
      )
    )
  on conflict do nothing;
  return new;
end;
$$;

create trigger letters_notify_after_insert after insert on public.letters
for each row execute function private.notify_letter_delivery();

create or replace function private.notify_archive_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
  entry_title text;
  entry_kind text;
  legacy_identifier text;
begin
  select entries.title, entries.kind::text, entries.legacy_id
    into entry_title, entry_kind, legacy_identifier
  from public.archive_entries entries where entries.id = new.entry_id;

  if new.parent_id is not null then
    select parent.author_id into recipient
    from public.archive_comments parent where parent.id = new.parent_id;
  else
    select spaces.owner_id into recipient
    from public.archive_spaces spaces where spaces.id = new.archive_id;
  end if;

  if recipient is not null and recipient <> new.author_id then
    insert into public.archive_notifications (
      archive_id, recipient_id, actor_id, event_type, comment_id, entry_id, payload
    ) values (
      new.archive_id,
      recipient,
      new.author_id,
      case when new.parent_id is null then 'mention' else 'letter_reply' end,
      new.id,
      new.entry_id,
      jsonb_build_object(
        'title', case when new.parent_id is null then '档案旁新增了访客旁注' else '有人回复了我的旁注' end,
        'entry_title', entry_title,
        'href', '/' || entry_kind || '/' || legacy_identifier || '#comment-' || new.id
      )
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger archive_comments_notify_after_insert after insert on public.archive_comments
for each row execute function private.notify_archive_comment();

create or replace function public.ensure_archive_mailbox(p_archive_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  target_mailbox uuid;
  archive_owner uuid;
  archive_name text;
begin
  if (select auth.uid()) is null or not (select private.can_read_archive(p_archive_id)) then
    raise exception 'archive_read_forbidden' using errcode = '42501';
  end if;

  select spaces.owner_id, spaces.name into archive_owner, archive_name
  from public.archive_spaces spaces where spaces.id = p_archive_id;

  insert into public.mailboxes (owner_id, archive_id, name)
  values (archive_owner, p_archive_id, '夜枭来信 · ' || archive_name)
  on conflict (archive_id) do nothing;

  select mailboxes.id into target_mailbox
  from public.mailboxes mailboxes where mailboxes.archive_id = p_archive_id;

  insert into public.mailbox_members (mailbox_id, user_id, role, is_active)
  select target_mailbox,
         members.user_id,
         case when members.user_id = archive_owner then 'owner'::public.mailbox_role else 'guest'::public.mailbox_role end,
         true
  from public.archive_members members
  where members.archive_id = p_archive_id and members.is_active
  on conflict (mailbox_id, user_id) do update
  set is_active = true,
      role = excluded.role;

  return target_mailbox;
end;
$$;

revoke execute on function private.can_read_archive_comment(uuid) from public, anon;
revoke execute on function private.can_read_letter(uuid) from public, anon;
revoke execute on function private.validate_archive_comment() from public, anon, authenticated;
revoke execute on function private.notify_letter_delivery() from public, anon, authenticated;
revoke execute on function private.notify_archive_comment() from public, anon, authenticated;
grant execute on function private.can_read_archive_comment(uuid) to authenticated;
grant execute on function private.can_read_letter(uuid) to authenticated;
revoke execute on function public.ensure_archive_mailbox(uuid) from public, anon;
grant execute on function public.ensure_archive_mailbox(uuid) to authenticated;

alter table public.archive_comments enable row level security;
alter table public.archive_comment_reactions enable row level security;
alter table public.archive_notifications enable row level security;

drop policy "letters visible to members" on public.letters;
create policy "letters visible within their audience"
on public.letters for select to authenticated
using ((select private.can_read_letter(id)));

drop policy "members create own letters" on public.letters;
create policy "members create own letters"
on public.letters for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.is_mailbox_member(mailbox_id))
  and (select private.can_read_archive(archive_id))
  and exists (
    select 1 from public.mailboxes
    where id = mailbox_id and archive_id = letters.archive_id
  )
  and (
    entry_id is null
    or exists (
      select 1 from public.archive_entries
      where id = entry_id and archive_id = letters.archive_id and deleted_at is null
    )
  )
);

create policy "comments visible within their audience"
on public.archive_comments for select to authenticated
using ((select private.can_read_archive_comment(id)));

create policy "archive members create comments"
on public.archive_comments for insert to authenticated
with check (
  author_id = (select auth.uid())
  and (select private.can_read_archive(archive_id))
  and exists (
    select 1 from public.archive_entries
    where id = entry_id and archive_id = archive_comments.archive_id and deleted_at is null
  )
);

create policy "authors and owners update comments"
on public.archive_comments for update to authenticated
using (author_id = (select auth.uid()) or (select private.is_archive_owner(archive_id)))
with check (author_id = (select auth.uid()) or (select private.is_archive_owner(archive_id)));

drop policy "reactions visible to members" on public.letter_reactions;
create policy "letter reactions visible to readers"
on public.letter_reactions for select to authenticated
using ((select private.can_read_letter(letter_id)));

drop policy "members insert own reactions" on public.letter_reactions;
create policy "readers insert own letter reactions"
on public.letter_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_read_letter(letter_id)));

create policy "comment reactions visible to readers"
on public.archive_comment_reactions for select to authenticated
using ((select private.can_read_archive_comment(comment_id)));

create policy "readers add own comment reactions"
on public.archive_comment_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.can_read_archive_comment(comment_id)));

create policy "members remove own comment reactions"
on public.archive_comment_reactions for delete to authenticated
using (user_id = (select auth.uid()));

create policy "recipients read own notifications"
on public.archive_notifications for select to authenticated
using (recipient_id = (select auth.uid()));

create policy "recipients update own notification read state"
on public.archive_notifications for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

grant select, insert on public.archive_comments to authenticated;
grant update (content, visibility, status, deleted_at) on public.archive_comments to authenticated;
grant select, insert, delete on public.archive_comment_reactions to authenticated;
grant select on public.archive_notifications to authenticated;
grant update (read_at) on public.archive_notifications to authenticated;
grant all on public.archive_comments, public.archive_comment_reactions, public.archive_notifications to service_role;

alter publication supabase_realtime add table public.archive_comments;
alter publication supabase_realtime add table public.archive_comment_reactions;
alter publication supabase_realtime add table public.archive_notifications;

comment on table public.archive_comments is 'Append-first marginalia anchored to an archive entry or a precise excerpt/session.';
comment on table public.archive_notifications is 'Meaningful recipient-scoped events; clients may only read and acknowledge their own rows.';
