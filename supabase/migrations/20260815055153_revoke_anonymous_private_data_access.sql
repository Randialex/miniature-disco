-- This application has no public archive surface. Anonymous sessions use
-- Supabase Auth only; every Data API read/write requires a signed-in identity.
-- Keep this list explicit so unrelated public-schema objects are untouched.
revoke all privileges on table
  public.archive_spaces,
  public.archive_members,
  public.archive_invitations,
  public.archive_entries,
  public.archive_entry_versions,
  public.archive_sync_operations,
  public.archive_backups
from public, anon;

-- Re-state the narrow signed-in grants after removing inherited PUBLIC access.
grant select on public.archive_entries to authenticated;
grant select, update on public.archive_spaces to authenticated;
grant select on public.archive_members, public.archive_invitations,
  public.archive_entry_versions, public.archive_backups to authenticated;

grant execute on function public.ensure_personal_archive() to authenticated;
grant execute on function public.create_archive_invitation(uuid, public.archive_member_role, integer) to authenticated;
grant execute on function public.accept_archive_invitation(text) to authenticated;
grant execute on function public.revoke_archive_invitation(uuid) to authenticated;
grant execute on function public.update_archive_member_role(uuid, uuid, public.archive_member_role, boolean) to authenticated;
grant execute on function public.apply_archive_entry_mutation(uuid, uuid, public.archive_kind, text, text, date, numeric, jsonb, bigint, boolean) to authenticated;
grant execute on function public.restore_archive_entry_version(uuid) to authenticated;
grant execute on function public.maintain_archive(uuid) to authenticated;
grant execute on function public.restore_archive_backup(uuid) to authenticated;
