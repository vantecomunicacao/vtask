-- Execute este comando no SQL Editor do Supabase Dashboard:

ALTER TABLE public.tasks 
ADD COLUMN recurrence TEXT DEFAULT 'none' 
CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly'));
