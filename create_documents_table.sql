-- Execute este comando no SQL Editor do Supabase:

-- 1. Criar tabela de documentos
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content JSONB, -- Formato JSON do TipTap
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS (Segurança)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acesso
CREATE POLICY "Workspace members can view documents" 
ON public.documents FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.documents.workspace_id 
    AND user_id = auth.uid()
));

CREATE POLICY "Workspace members can create documents" 
ON public.documents FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.documents.workspace_id 
    AND user_id = auth.uid()
));

CREATE POLICY "Workspace members can update documents" 
ON public.documents FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.documents.workspace_id 
    AND user_id = auth.uid()
));

CREATE POLICY "Workspace members can delete documents" 
ON public.documents FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = public.documents.workspace_id 
    AND user_id = auth.uid()
));

-- 4. Gatilho para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
