-- Make the internal idempotency ledger explicitly deny direct row access.
-- RPCs remain its only access path and run their own auth.uid()/archive-role checks.
create policy "sync operations deny direct access"
on public.archive_sync_operations
for all to authenticated
using (false)
with check (false);

create index archive_invitations_invited_by_idx
  on public.archive_invitations (invited_by);
create index archive_invitations_accepted_by_idx
  on public.archive_invitations (accepted_by)
  where accepted_by is not null;
