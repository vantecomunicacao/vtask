import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // --- Auth: verificar se o caller é platform admin ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Cliente com o JWT do usuário (respeita RLS)
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("id, is_platform_admin")
    .single();

  if (profileError || !profile?.is_platform_admin) {
    return json({ error: "Acesso negado. Somente administradores da plataforma." }, 403);
  }

  // Cliente admin (service_role — bypassa RLS, usado apenas aqui)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Roteamento por action ---
  const { action, ...payload } = await req.json();

  // LIST — retorna todos os usuários com perfil
  if (action === "list") {
    const { data: users, error } = await adminClient.auth.admin.listUsers();
    if (error) return json({ error: error.message }, 500);

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email, is_platform_admin");

    const { data: workspaces } = await adminClient
      .from("workspace_members")
      .select("user_id, role, workspaces(id, name)")
      .eq("role", "admin");

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const workspaceMap = Object.fromEntries(
      (workspaces ?? []).map((w) => [w.user_id, (w.workspaces as { id: string; name: string } | null)])
    );

    const result = users.users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: profileMap[u.id]?.full_name ?? null,
      is_platform_admin: profileMap[u.id]?.is_platform_admin ?? false,
      workspace: workspaceMap[u.id] ?? null,
      banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
      created_at: u.created_at,
    }));

    return json({ users: result });
  }

  // CREATE — cria conta + workspace (trigger no banco faz o workspace automaticamente)
  if (action === "create") {
    const { email, password, full_name } = payload as {
      email: string;
      password: string;
      full_name: string;
    };

    if (!email || !password || !full_name) {
      return json({ error: "email, password e full_name são obrigatórios" }, 400);
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // já confirma, sem precisar clicar em email
      user_metadata: { full_name },
    });

    if (error) return json({ error: error.message }, 400);
    return json({ user: { id: data.user.id, email: data.user.email } });
  }

  // DISABLE — bloqueia login por 100 anos
  if (action === "disable") {
    const { user_id } = payload as { user_id: string };
    if (!user_id) return json({ error: "user_id obrigatório" }, 400);
    if (user_id === profile.id) return json({ error: "Você não pode se desativar" }, 400);

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: "876600h",
    });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  // ENABLE — remove o bloqueio
  if (action === "enable") {
    const { user_id } = payload as { user_id: string };
    if (!user_id) return json({ error: "user_id obrigatório" }, 400);

    const { error } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: "none",
    });
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  // RESET-PASSWORD — envia email de redefinição
  if (action === "reset-password") {
    const { email } = payload as { email: string };
    if (!email) return json({ error: "email obrigatório" }, 400);

    const { error } = await adminClient.auth.resetPasswordForEmail(email);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: `Action desconhecida: ${action}` }, 400);
});
