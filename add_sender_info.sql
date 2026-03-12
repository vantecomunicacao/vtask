-- Adiciona informações de remetente aos perfis de e-mail
ALTER TABLE email_profiles 
ADD COLUMN IF NOT EXISTS sender_name TEXT,
ADD COLUMN IF NOT EXISTS sender_email TEXT;
