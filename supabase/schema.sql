-- 1. Create custom enum types
CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Create tables
-- profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- workspaces
CREATE TABLE workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_color TEXT DEFAULT '#db4035',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- workspace_members
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (workspace_id, user_id)
);

-- clients
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- email_clients
CREATE TABLE email_clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mailchimp_api_key TEXT,
  mailchimp_prefix TEXT,
  custom_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- projects
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#808080',
  icon TEXT DEFAULT 'Hash',
  start_date DATE,
  due_date DATE,
  status project_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- task_status_workflow
CREATE TABLE custom_statuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#808080',
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- tasks
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- For subtasks
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status_id UUID REFERENCES custom_statuses(id) ON DELETE RESTRICT,
  priority task_priority DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER DEFAULT 0, -- For Kanban ordering
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- comments
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- attachments
CREATE TABLE task_attachments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS — habilitado em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_clients ENABLE ROW LEVEL SECURITY;

-- Função helper: verifica se o usuário atual é membro de um workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
$$;

-- PROFILES: próprio perfil + perfis de membros do mesmo workspace
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM workspace_members wm1 JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  )
);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- WORKSPACES: membros veem; admins editam; qualquer auth cria
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT USING (public.is_workspace_member(id));
CREATE POLICY "workspaces_insert" ON workspaces FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "workspaces_delete" ON workspaces FOR DELETE USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid() AND role = 'admin'));

-- WORKSPACE_MEMBERS: membros veem; admins gerenciam; usuário pode entrar/sair
CREATE POLICY "workspace_members_select" ON workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY "workspace_members_insert" ON workspace_members FOR INSERT WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin'));
CREATE POLICY "workspace_members_update" ON workspace_members FOR UPDATE USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin'));
CREATE POLICY "workspace_members_delete" ON workspace_members FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid() AND wm.role = 'admin'));

-- CLIENTS / EMAIL_CLIENTS / PROJECTS / CUSTOM_STATUSES: membros do workspace
CREATE POLICY "clients_all" ON clients FOR ALL USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "email_clients_all" ON email_clients FOR ALL USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "projects_all" ON projects FOR ALL USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY "custom_statuses_all" ON custom_statuses FOR ALL USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

-- TASKS: via project → workspace_members
CREATE POLICY "tasks_all" ON tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND public.is_workspace_member(p.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id AND public.is_workspace_member(p.workspace_id)));

-- COMMENTS: membros veem/criam; autor edita/deleta
CREATE POLICY "comments_select" ON comments FOR SELECT USING (EXISTS (SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = comments.task_id AND public.is_workspace_member(p.workspace_id)));
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = comments.task_id AND public.is_workspace_member(p.workspace_id)));
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (user_id = auth.uid());

-- TASK_ATTACHMENTS: membros veem/fazem upload; uploader deleta
CREATE POLICY "task_attachments_select" ON task_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = task_attachments.task_id AND public.is_workspace_member(p.workspace_id)));
CREATE POLICY "task_attachments_insert" ON task_attachments FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = task_attachments.task_id AND public.is_workspace_member(p.workspace_id)));
CREATE POLICY "task_attachments_delete" ON task_attachments FOR DELETE USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Create default workspace for user
  WITH new_workspace AS (
    INSERT INTO public.workspaces (name) 
    VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'Meu Workspace') || ' Workspace')
    RETURNING id
  )
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT id, new.id, 'admin' FROM new_workspace;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- email_profiles (perfis de cliente para o Gerador de Email)
-- RLS baseada em created_by (por usuário, não por workspace)
CREATE TABLE email_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  mailchimp_api_key TEXT,
  mailchimp_server TEXT DEFAULT 'us5',
  mailchimp_list_id TEXT,
  ai_prompt TEXT,
  brand_color TEXT DEFAULT '#db4035',
  button_color TEXT DEFAULT '#db4035',
  logo_url TEXT,
  banner_url TEXT,
  cta_enabled BOOLEAN DEFAULT true,
  email_length TEXT DEFAULT 'medium' CHECK (email_length IN ('short', 'medium', 'long')),
  default_button_text TEXT,
  default_button_link TEXT,
  test_email TEXT,
  themes_list TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE email_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages profiles" ON email_profiles FOR ALL
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- email_schedules (agendamentos de envio automático por perfil)
CREATE TABLE email_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES email_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'newsletter',
  prompt_override TEXT,
  bg_color TEXT DEFAULT '#f4f4f4',
  button_color TEXT DEFAULT '#db4035',
  button_text TEXT,
  button_link TEXT,
  active BOOLEAN DEFAULT true,
  is_dynamic_theme BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE email_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages schedules" ON email_schedules FOR ALL
  USING (profile_id IN (SELECT id FROM email_profiles WHERE created_by = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM email_profiles WHERE created_by = auth.uid()));

-- email_schedule_history (histórico de execuções)
CREATE TABLE email_schedule_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES email_schedules(id) ON DELETE CASCADE NOT NULL,
  ran_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  subject TEXT,
  campaign_id TEXT,
  error_message TEXT
);
ALTER TABLE email_schedule_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner views history" ON email_schedule_history FOR SELECT
  USING (schedule_id IN (
    SELECT es.id FROM email_schedules es
    JOIN email_profiles ep ON ep.id = es.profile_id
    WHERE ep.created_by = auth.uid()
  ));

-- email_drafts (rascunhos por workspace)
CREATE TABLE email_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'newsletter',
  title TEXT,
  prompt TEXT,
  logo_url TEXT,
  banner_url TEXT,
  bottom_image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  bg_color TEXT DEFAULT '#f4f4f4',
  button_color TEXT DEFAULT '#db4035',
  generated_html TEXT,
  generated_subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members manage drafts" ON email_drafts FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- email_image_log (log para limpeza automática de imagens após 15 dias)
CREATE TABLE email_image_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  path TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
ALTER TABLE email_image_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace members manage image log" ON email_image_log FOR ALL
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Storage Buckets Configuration
-- Note: You may need to run this as a superuser or via the Supabase Dashboard if you lack permissions.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('task_attachments', 'task_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task_attachments');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'task_attachments');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'task_attachments');

CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'task_attachments');
