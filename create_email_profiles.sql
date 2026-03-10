-- Perfis de cliente para o Gerador de Email
-- Sem relação com workspaces/projects — apenas created_by = auth.uid()

create table if not exists email_profiles (
    id uuid default gen_random_uuid() primary key,
    created_by uuid references auth.users(id) on delete cascade not null,
    name text not null,
    mailchimp_api_key text,
    mailchimp_server text default 'us5',
    mailchimp_list_id text,
    ai_prompt text,
    brand_color text default '#db4035',
    logo_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table email_profiles enable row level security;

create policy "owner manages profiles"
    on email_profiles for all
    using (created_by = auth.uid())
    with check (created_by = auth.uid());

-- Agendamentos vinculados ao perfil
create table if not exists email_schedules (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references email_profiles(id) on delete cascade not null,
    name text not null,
    cron_expression text not null,  -- ex: "0 9 * * 1" = toda segunda às 9h
    template_id text not null default 'newsletter',
    prompt_override text,           -- se vazio, usa o prompt do perfil
    bg_color text default '#f4f4f4',
    button_color text default '#db4035',
    button_text text,
    button_link text,
    active boolean default true,
    last_run_at timestamptz,
    next_run_at timestamptz,
    created_at timestamptz default now()
);

alter table email_schedules enable row level security;

create policy "owner manages schedules"
    on email_schedules for all
    using (
        profile_id in (
            select id from email_profiles where created_by = auth.uid()
        )
    )
    with check (
        profile_id in (
            select id from email_profiles where created_by = auth.uid()
        )
    );

-- Histórico de execuções do agendamento
create table if not exists email_schedule_history (
    id uuid default gen_random_uuid() primary key,
    schedule_id uuid references email_schedules(id) on delete cascade not null,
    ran_at timestamptz default now(),
    success boolean not null,
    subject text,
    campaign_id text,
    error_message text
);

alter table email_schedule_history enable row level security;

create policy "owner views history"
    on email_schedule_history for select
    using (
        schedule_id in (
            select es.id from email_schedules es
            join email_profiles ep on ep.id = es.profile_id
            where ep.created_by = auth.uid()
        )
    );
