-- Adiciona coluna banner_url ao email_profiles
alter table email_profiles add column if not exists banner_url text;
