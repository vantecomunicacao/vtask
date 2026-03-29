import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, UserX, UserCheck, KeyRound, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';

interface PlatformUser {
    id: string;
    email: string;
    full_name: string | null;
    is_platform_admin: boolean;
    workspace: { id: string; name: string } | null;
    banned: boolean;
    created_at: string;
}

interface CreateForm {
    full_name: string;
    email: string;
    password: string;
}

async function callAdmin(action: string, payload: Record<string, unknown> = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke('admin-manage-users', {
        body: { action, ...payload },
        headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data;
}

export default function Admin() {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [users, setUsers] = useState<PlatformUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [form, setForm] = useState<CreateForm>({ full_name: '', email: '', password: '' });

    // Verifica se é admin antes de carregar
    useEffect(() => {
        (async () => {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('is_platform_admin')
                .eq('id', user.id)
                .single();

            if (!data?.is_platform_admin) {
                setAuthorized(false);
                navigate('/dashboard');
                return;
            }
            setAuthorized(true);
        })();
    }, [user, navigate]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callAdmin('list');
            setUsers(data.users);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authorized) loadUsers();
    }, [authorized, loadUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name || !form.email || !form.password) {
            toast.error('Preencha todos os campos');
            return;
        }
        setActionLoading('create');
        try {
            await callAdmin('create', form as unknown as Record<string, unknown>);
            toast.success(`Conta criada para ${form.email}`);
            setForm({ full_name: '', email: '', password: '' });
            setShowCreateForm(false);
            await loadUsers();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro ao criar conta');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleBan = async (u: PlatformUser) => {
        setActionLoading(u.id);
        try {
            const action = u.banned ? 'enable' : 'disable';
            await callAdmin(action, { user_id: u.id });
            toast.success(u.banned ? 'Conta reativada' : 'Conta desativada');
            await loadUsers();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(null);
        }
    };

    const handleResetPassword = async (email: string) => {
        setActionLoading(`reset-${email}`);
        try {
            await callAdmin('reset-password', { email });
            toast.success(`Email de redefinição enviado para ${email}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro');
        } finally {
            setActionLoading(null);
        }
    };

    if (authorized === null || loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-brand" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                        <Shield size={20} className="text-brand" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-primary">Administração da Plataforma</h1>
                        <p className="text-sm text-secondary">{users.length} conta{users.length !== 1 ? 's' : ''} registrada{users.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
                    <Plus size={16} />
                    Nova Conta
                </Button>
            </div>

            {/* Formulário de criação */}
            {showCreateForm && (
                <div className="bg-surface-card border border-border-subtle rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-primary">Criar nova conta</h2>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="text-muted hover:text-primary transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                            placeholder="Nome completo"
                            value={form.full_name}
                            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                        />
                        <Input
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        />
                        <Input
                            type="password"
                            placeholder="Senha provisória"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        />
                        <div className="sm:col-span-3 flex justify-end">
                            <Button type="submit" disabled={actionLoading === 'create'} className="flex items-center gap-2">
                                {actionLoading === 'create' && <Loader2 size={14} className="animate-spin" />}
                                Criar Conta
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lista de usuários */}
            <div className="bg-surface-card border border-border-subtle rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border-subtle bg-surface-1">
                            <th className="text-left px-4 py-3 font-semibold text-secondary">Usuário</th>
                            <th className="text-left px-4 py-3 font-semibold text-secondary hidden md:table-cell">Workspace</th>
                            <th className="text-left px-4 py-3 font-semibold text-secondary hidden lg:table-cell">Criado em</th>
                            <th className="text-left px-4 py-3 font-semibold text-secondary">Status</th>
                            <th className="text-right px-4 py-3 font-semibold text-secondary">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-surface-1 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                                            {(u.full_name ?? u.email).substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-primary truncate">
                                                {u.full_name ?? '—'}
                                                {u.is_platform_admin && (
                                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand bg-brand/10 px-1.5 py-0.5 rounded-full">Admin</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted truncate">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-secondary hidden md:table-cell">
                                    {u.workspace?.name ?? <span className="text-muted">—</span>}
                                </td>
                                <td className="px-4 py-3 text-secondary hidden lg:table-cell">
                                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={u.banned ? 'viewer' : 'editor'}>
                                        {u.banned ? 'Inativa' : 'Ativa'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Não mostra ações no próprio admin */}
                                        {u.id !== user?.id && (
                                            <>
                                                <button
                                                    onClick={() => handleToggleBan(u)}
                                                    disabled={actionLoading === u.id}
                                                    title={u.banned ? 'Reativar conta' : 'Desativar conta'}
                                                    className="p-1.5 rounded-lg text-secondary hover:bg-surface-2 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === u.id
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : u.banned
                                                            ? <UserCheck size={16} className="text-green-600" />
                                                            : <UserX size={16} className="text-red-500" />
                                                    }
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(u.email)}
                                                    disabled={actionLoading === `reset-${u.email}`}
                                                    title="Enviar email de redefinição de senha"
                                                    className="p-1.5 rounded-lg text-secondary hover:bg-surface-2 transition-colors disabled:opacity-50"
                                                >
                                                    {actionLoading === `reset-${u.email}`
                                                        ? <Loader2 size={16} className="animate-spin" />
                                                        : <KeyRound size={16} />
                                                    }
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {users.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted text-sm">
                        Nenhum usuário encontrado.
                    </div>
                )}
            </div>
        </div>
    );
}
