-- P1: daily capture, encounter history, reusable tags, private assets and explainable revisits.
-- Supabase CLI is not present in this workspace, so this migration is intentionally self-contained.

create table public.archive_sessions (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  started_at date not null,
  ended_at date,
  status text not null check (status in ('planned','active','completed','paused','dropped')),
  rating numeric(2,1) check (rating between 0 and 5),
  progress_current numeric check (progress_current >= 0),
  progress_total numeric check (progress_total > 0),
  progress_unit text check (char_length(progress_unit) <= 20),
  emotion text check (emotion in ('治愈','震撼','怅然','上头','意难平','平静')),
  reflection text not null default '' check (char_length(reflection) <= 12000),
  is_revisit boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at),
  check (progress_current is null or progress_total is null or progress_current <= progress_total)
);

create table public.archive_tags (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  color text not null default '#8d6ea8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (archive_id, name)
);

create table public.archive_entry_tags (
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  tag_id uuid not null references public.archive_tags(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (entry_id, tag_id)
);

create table public.archive_assets (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 5 and 500),
  crop_ratio text not null check (crop_ratio in ('book','poster')),
  focus_x numeric(5,2) not null default 50 check (focus_x between 0 and 100),
  focus_y numeric(5,2) not null default 50 check (focus_y between 0 and 100),
  theme_color text not null check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  overlay numeric(5,2) not null default 35 check (overlay between 0 and 100),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  original_width integer not null check (original_width > 0),
  original_height integer not null check (original_height > 0),
  uploaded_by uuid not null references public.profiles(id),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_revisit_events (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_spaces(id) on delete cascade,
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  event_type text not null check (event_type in ('shown','opened','skipped','snoozed','sealed')),
  recommendation_score numeric(7,3),
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.archive_links add column archive_id uuid references public.archive_spaces(id) on delete cascade;
alter table public.archive_links add column relation_type text not null default 'manual';
alter table public.archive_links add column note text not null default '';
alter table public.archive_links add column created_by uuid references public.profiles(id);

update public.archive_links links
set archive_id = entries.archive_id,
    created_by = coalesce(links.created_by, links.owner_id),
    relation_type = case links.label
      when '改编' then 'adaptation' when '出处' then 'source'
      else 'manual' end
from public.archive_entries entries
where entries.id = links.source_id;

delete from public.archive_links where archive_id is null;
alter table public.archive_links alter column archive_id set not null;
alter table public.archive_links alter column created_by set not null;
alter table public.archive_links add constraint archive_links_relation_type_check check (relation_type in ('adaptation','source','character','theme','emotion','manual','quote_source','discovery'));
alter table public.archive_links add constraint archive_links_note_length_check check (char_length(note) <= 1000);

create index archive_sessions_entry_started_idx on public.archive_sessions(entry_id, started_at desc);
create index archive_sessions_archive_created_idx on public.archive_sessions(archive_id, created_at desc);
create index archive_tags_archive_usage_idx on public.archive_tags(archive_id, name);
create index archive_entry_tags_archive_idx on public.archive_entry_tags(archive_id, tag_id);
create index archive_assets_entry_idx on public.archive_assets(entry_id, updated_at desc);
create index archive_revisit_entry_created_idx on public.archive_revisit_events(entry_id, created_at desc);
create index archive_revisit_archive_type_idx on public.archive_revisit_events(archive_id, event_type, created_at desc);
create index archive_links_archive_idx on public.archive_links(archive_id, created_at desc);

create trigger archive_sessions_touch_updated_at before update on public.archive_sessions
for each row execute function private.touch_updated_at();
create trigger archive_assets_touch_updated_at before update on public.archive_assets
for each row execute function private.touch_updated_at();

alter table public.archive_sessions enable row level security;
alter table public.archive_tags enable row level security;
alter table public.archive_entry_tags enable row level security;
alter table public.archive_assets enable row level security;
alter table public.archive_revisit_events enable row level security;

create policy "sessions visible to archive members" on public.archive_sessions for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "sessions appended by editors" on public.archive_sessions for insert to authenticated
with check ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()) and exists (select 1 from public.archive_entries e where e.id = entry_id and e.archive_id = archive_sessions.archive_id));
create policy "session authors update their records" on public.archive_sessions for update to authenticated
using ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()))
with check ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()));
create policy "session authors or owners delete records" on public.archive_sessions for delete to authenticated
using ((created_by = (select auth.uid()) and (select private.can_write_archive(archive_id))) or (select private.is_archive_owner(archive_id)));

create policy "tags visible to archive members" on public.archive_tags for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "tags inserted by editors" on public.archive_tags for insert to authenticated
with check ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()));
create policy "tags updated by editors" on public.archive_tags for update to authenticated
using ((select private.can_write_archive(archive_id))) with check ((select private.can_write_archive(archive_id)));
create policy "tags deleted by editors" on public.archive_tags for delete to authenticated
using ((select private.can_write_archive(archive_id)));
create policy "entry tags visible to archive members" on public.archive_entry_tags for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "entry tags inserted by editors" on public.archive_entry_tags for insert to authenticated
with check ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()) and exists (select 1 from public.archive_entries e where e.id = entry_id and e.archive_id = archive_entry_tags.archive_id) and exists (select 1 from public.archive_tags t where t.id = tag_id and t.archive_id = archive_entry_tags.archive_id));
create policy "entry tags deleted by editors" on public.archive_entry_tags for delete to authenticated
using ((select private.can_write_archive(archive_id)));

create policy "assets visible to archive members" on public.archive_assets for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "assets inserted by editors" on public.archive_assets for insert to authenticated
with check ((select private.can_write_archive(archive_id)) and uploaded_by = (select auth.uid()) and exists (select 1 from public.archive_entries e where e.id = entry_id and e.archive_id = archive_assets.archive_id));
create policy "assets updated by editors" on public.archive_assets for update to authenticated
using ((select private.can_write_archive(archive_id))) with check ((select private.can_write_archive(archive_id)));
create policy "assets deleted by editors" on public.archive_assets for delete to authenticated
using ((select private.can_write_archive(archive_id)));

create policy "revisit events visible to archive members" on public.archive_revisit_events for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "members record own revisit feedback" on public.archive_revisit_events for insert to authenticated
with check ((select private.can_read_archive(archive_id)) and actor_id = (select auth.uid()) and exists (select 1 from public.archive_entries e where e.id = entry_id and e.archive_id = archive_revisit_events.archive_id));

drop policy if exists "archive links owner all" on public.archive_links;
create policy "archive links visible to members" on public.archive_links for select to authenticated
using ((select private.can_read_archive(archive_id)));
create policy "archive links inserted by editors" on public.archive_links for insert to authenticated
with check ((select private.can_write_archive(archive_id)) and created_by = (select auth.uid()) and exists (select 1 from public.archive_entries s where s.id = source_id and s.archive_id = archive_links.archive_id) and exists (select 1 from public.archive_entries t where t.id = target_id and t.archive_id = archive_links.archive_id));
create policy "archive links updated by editors" on public.archive_links for update to authenticated
using ((select private.can_write_archive(archive_id)))
with check ((select private.can_write_archive(archive_id)) and exists (select 1 from public.archive_entries s where s.id = source_id and s.archive_id = archive_links.archive_id) and exists (select 1 from public.archive_entries t where t.id = target_id and t.archive_id = archive_links.archive_id));
create policy "archive links deleted by editors" on public.archive_links for delete to authenticated
using ((select private.can_write_archive(archive_id)));

revoke all on public.archive_sessions, public.archive_tags, public.archive_entry_tags, public.archive_assets, public.archive_revisit_events from public, anon;
grant select, insert, update, delete on public.archive_sessions, public.archive_tags, public.archive_entry_tags, public.archive_assets to authenticated;
grant select, insert on public.archive_revisit_events to authenticated;
grant select, insert, update, delete on public.archive_links to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archive-assets', 'archive-assets', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "archive asset objects read" on storage.objects;
drop policy if exists "archive asset objects insert" on storage.objects;
drop policy if exists "archive asset objects update" on storage.objects;
drop policy if exists "archive asset objects delete" on storage.objects;

create policy "archive asset objects read" on storage.objects for select to authenticated
using (bucket_id = 'archive-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and (select private.can_read_archive(((storage.foldername(name))[1])::uuid)));
create policy "archive asset objects insert" on storage.objects for insert to authenticated
with check (bucket_id = 'archive-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and array_length(storage.foldername(name), 1) >= 2 and (select private.can_write_archive(((storage.foldername(name))[1])::uuid)));
create policy "archive asset objects update" on storage.objects for update to authenticated
using (bucket_id = 'archive-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and (select private.can_write_archive(((storage.foldername(name))[1])::uuid)))
with check (bucket_id = 'archive-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and (select private.can_write_archive(((storage.foldername(name))[1])::uuid)));
create policy "archive asset objects delete" on storage.objects for delete to authenticated
using (bucket_id = 'archive-assets' and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and (select private.can_write_archive(((storage.foldername(name))[1])::uuid)));

alter publication supabase_realtime add table public.archive_sessions;

comment on table public.archive_sessions is 'Append-oriented reading and viewing encounters; prior sessions are never overwritten.';
comment on table public.archive_revisit_events is 'Explainable recommendation impressions and explicit member feedback.';
comment on table public.archive_assets is 'Metadata for private Storage objects; clients persist paths, never public URLs.';
