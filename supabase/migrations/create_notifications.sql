create table notifications (
  id          uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  actor_id    uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in ('task_assigned', 'comment', 'mention')),
  task_id     uuid references tasks(id) on delete cascade,
  task_title  text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on notifications(user_id, read, created_at desc);

alter table notifications enable row level security;

create policy "Users can read own notifications"
  on notifications for select
  using (user_id = auth.uid());

create policy "Workspace members can insert notifications"
  on notifications for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

create policy "Users can update own notifications"
  on notifications for update
  using (user_id = auth.uid());

-- Enable realtime
alter publication supabase_realtime add table notifications;
