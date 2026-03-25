begin;

drop policy if exists "Authenticated users can receive browser active presence"
on realtime.messages;

create policy "Authenticated users can receive browser active presence"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'presence'
    and realtime.topic() = 'browser-active'
  );

drop policy if exists "Authenticated users can publish browser active presence"
on realtime.messages;

create policy "Authenticated users can publish browser active presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and realtime.topic() = 'browser-active'
  );

commit;
