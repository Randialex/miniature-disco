drop policy "members managed by mailbox owner" on public.mailbox_members;

create policy "mailbox owner inserts members"
on public.mailbox_members for insert to authenticated
with check ((select private.is_mailbox_owner(mailbox_id)));

create policy "mailbox owner updates members"
on public.mailbox_members for update to authenticated
using ((select private.is_mailbox_owner(mailbox_id)))
with check ((select private.is_mailbox_owner(mailbox_id)));

create policy "mailbox owner deletes members"
on public.mailbox_members for delete to authenticated
using ((select private.is_mailbox_owner(mailbox_id)));
