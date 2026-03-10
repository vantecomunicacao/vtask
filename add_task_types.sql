-- Execute este comando no SQL Editor do Supabase:

-- 1. Criar tabela de categorias (tipos de tarefa)
CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS (Segurança)
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view categories" 
ON public.task_categories FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.task_categories.workspace_id 
    AND user_id = auth.uid()
));

CREATE POLICY "Workspace members can manage categories" 
ON public.task_categories FOR ALL 
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.task_categories.workspace_id 
    AND user_id = auth.uid()
));

-- 3. Adicionar coluna category_id na tabela tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.task_categories(id) ON DELETE SET NULL;
