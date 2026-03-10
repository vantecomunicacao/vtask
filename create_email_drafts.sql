-- Log de imagens para limpeza automática após 15 dias
create table if not exists email_image_log (
    id uuid default gen_random_uuid() primary key,
    path text not null,
    workspace_id uuid references workspaces(id) on delete cascade,
    uploaded_at timestamptz default now() not null
);
alter table email_image_log enable row level security;
create policy "workspace members manage image log"
    on email_image_log for all
    using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
    ));

-- Rascunhos de email
create table if not exists email_drafts (
    id uuid default gen_random_uuid() primary key,
    workspace_id uuid references workspaces(id) on delete cascade,
    created_by uuid references profiles(id),
    name text not null,
    template_id text not null default 'newsletter',
    title text,
    prompt text,
    logo_url text,
    banner_url text,
    bottom_image_url text,
    button_text text,
    button_link text,
    bg_color text default '#f4f4f4',
    button_color text default '#db4035',
    generated_html text,
    generated_subject text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
alter table email_drafts enable row level security;
create policy "workspace members manage drafts"
    on email_drafts for all
    using (workspace_id in (
        select workspace_id from workspace_members where user_id = auth.uid()
    ));
