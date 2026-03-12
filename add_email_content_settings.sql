-- Configurações de conteúdo por perfil de email
alter table email_profiles
  add column if not exists cta_enabled boolean not null default true,
  add column if not exists email_length text not null default 'medium'
    check (email_length in ('short', 'medium', 'long'));
