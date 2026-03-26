import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Building2, Users2, Palette, Layout, Plus, Trash2, GripVertical, Settings2, Eye, EyeOff, Paintbrush, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTaskStore, type CustomStatus } from '../store/taskStore';
import { useThemeStore, THEMES } from '../store/themeStore';
import { toast } from 'sonner';
import type { Database } from '../lib/database.types';
type TaskCategory = Database['public']['Tables']['task_categories']['Row'];

type Profile = Database['public']['Tables']['profiles']['Row'];
type WorkspaceMemberRole = Database['public']['Tables']['workspace_members']['Row']['role'];

interface WorkspaceMember {
    role: WorkspaceMemberRole;
    profiles: Pick<Profile, 'id' | 'full_name' | 'email'>[] | null;
}

export default function Configuracoes() {
    const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const { statuses, fetchStatuses, addStatus, updateStatus, deleteStatus, updateStatusPositions } = useTaskStore();
    const [name, setName] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [activeTab, setActiveTab] = useState<'geral' | 'equipe' | 'fluxo' | 'categorias' | 'aparencia'>('geral');
    const { theme, setTheme, darkMode, toggleDarkMode } = useThemeStore();

    // Status management state
    const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
    const [statusName, setStatusName] = useState('');
    const [statusColor, setStatusColor] = useState('#808080');

    // Category management state
    const { taskCategories, fetchCategories, addCategory, updateCategory, deleteCategory } = useTaskStore();
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryColor, setCategoryColor] = useState('#3b82f6');

    const loadMembers = useCallback(async () => {
        if (!activeWorkspace) return;
        const { data } = await supabase
            .from('workspace_members')
            .select('role, profiles(id, full_name, email)')
            .eq('workspace_id', activeWorkspace.id);

        if (data) setMembers(data as WorkspaceMember[]);
    }, [activeWorkspace]);

    useEffect(() => {
        if (activeWorkspace) {
            setName(activeWorkspace.name);
            setOpenaiKey(activeWorkspace.openai_api_key ?? '');
            loadMembers();
            fetchStatuses(activeWorkspace.id);
            fetchCategories(activeWorkspace.id);
        }
    }, [activeWorkspace, loadMembers, fetchStatuses, fetchCategories]);

    const handleSaveWorkspace = async () => {
        if (!activeWorkspace || !name.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('workspaces')
                .update({ name: name.trim(), openai_api_key: openaiKey.trim() || null })
                .eq('id', activeWorkspace.id);

            if (error) throw error;
            toast.success('Workspace atualizado com sucesso!');
            await fetchWorkspaces();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Erro ao atualizar workspace';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.info('Fluxo de convite será implementado no backend via Edge Function ou Server Action.');
        setInviteEmail('');
    };

    const handleAddStatus = async () => {
        if (!activeWorkspace || !statusName.trim()) return;
        setLoading(true);
        try {
            await addStatus(activeWorkspace.id, statusName.trim(), statusColor);
            setStatusName('');
            setStatusColor('#808080');
            toast.success('Status adicionado com sucesso!');
        } catch {
            toast.error('Erro ao adicionar status');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string) => {
        try {
            await updateStatus(id, { name: statusName, color: statusColor });
            setEditingStatusId(null);
            setStatusName('');
            toast.success('Status atualizado!');
        } catch {
            toast.error('Erro ao atualizar status');
        }
    };

    const startEditing = (status: CustomStatus) => {
        setEditingStatusId(status.id);
        setStatusName(status.name);
        setStatusColor(status.color || '#808080');
    };

    const handleDeleteStatus = async (id: string) => {
        if (!window.confirm('Excluir este status? Tarefas neste status podem ficar sem categoria.')) return;
        try {
            await deleteStatus(id);
            toast.success('Status removido');
        } catch {
            toast.error('Erro ao remover status');
        }
    };

    const moveStatus = async (id: string, direction: 'up' | 'down') => {
        const currentIndex = statuses.findIndex(s => s.id === id);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= statuses.length) return;

        const newOrder = [...statuses.map(s => s.id)];
        const [removed] = newOrder.splice(currentIndex, 1);
        newOrder.splice(newIndex, 0, removed);

        try {
            await updateStatusPositions(newOrder);
        } catch {
            toast.error('Erro ao reordenar status');
        }
    };

    const handleAddCategory = async () => {
        if (!activeWorkspace || !categoryName.trim()) return;
        setLoading(true);
        try {
            await addCategory(activeWorkspace.id, categoryName.trim(), categoryColor);
            setCategoryName('');
            setCategoryColor('#3b82f6');
            toast.success('Tipo de tarefa adicionado!');
        } catch {
            toast.error('Erro ao adicionar tipo');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCategory = async (id: string) => {
        try {
            await updateCategory(id, { name: categoryName, color: categoryColor });
            setEditingCategoryId(null);
            setCategoryName('');
            toast.success('Tipo de tarefa atualizado!');
        } catch {
            toast.error('Erro ao atualizar tipo');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!window.confirm('Excluir este tipo de tarefa?')) return;
        try {
            await deleteCategory(id);
            toast.success('Tipo de tarefa removido');
        } catch {
            toast.error('Erro ao remover tipo');
        }
    };

    const startEditingCategory = (category: TaskCategory) => {
        setEditingCategoryId(category.id);
        setCategoryName(category.name);
        setCategoryColor(category.color || '#3b82f6');
    };

    const loadDefaultCategories = async () => {
        if (!activeWorkspace) return;
        const defaults = [
            { name: 'Tarefa pontual', color: '#64748b' },
            { name: 'Tráfego pago', color: '#10b981' },
            { name: 'Design', color: '#8b5cf6' }
        ];

        setLoading(true);
        try {
            await Promise.all(defaults.map(item => addCategory(activeWorkspace.id, item.name, item.color)));
            toast.success('Padrões carregados com sucesso!');
        } catch {
            toast.error('Erro ao carregar padrões');
        } finally {
            setLoading(false);
        }
    };

    if (!activeWorkspace) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in h-full pb-10">
            <div>
                <h1 className="text-2xl font-bold text-primary mb-2">Configurações do Workspace</h1>
                <p className="text-sm text-secondary">Gerencie detalhes da sua agência e os membros da sua equipe.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Lateral Menu do Settings */}
                <div className="col-span-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('geral')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'geral' ? 'bg-brand-light text-brand' : 'hover:bg-surface-0 text-secondary'}`}
                    >
                        <Building2 size={18} /> Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('equipe')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'equipe' ? 'bg-brand-light text-brand' : 'hover:bg-surface-0 text-secondary'}`}
                    >
                        <Users2 size={18} /> Equipe
                    </button>
                    <button
                        onClick={() => setActiveTab('fluxo')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'fluxo' ? 'bg-brand-light text-brand' : 'hover:bg-surface-0 text-secondary'}`}
                    >
                        <Layout size={18} /> Fluxo de Trabalho
                    </button>
                    <button
                        onClick={() => setActiveTab('categorias')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'categorias' ? 'bg-brand-light text-brand' : 'hover:bg-surface-0 text-secondary'}`}
                    >
                        <Palette size={18} /> Tipos de Tarefa
                    </button>
                    <button
                        onClick={() => setActiveTab('aparencia')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'aparencia' ? 'bg-brand-light text-brand' : 'hover:bg-surface-0 text-secondary'}`}
                    >
                        <Paintbrush size={18} /> Aparência
                    </button>
                </div>

                {/* Conteúdo do Settings */}
                <div className="col-span-1 md:col-span-2 space-y-6">

                    {/* Geral */}
                    {activeTab === 'geral' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhes da Empresa</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-secondary">Nome do Workspace</label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Nome da sua agência"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-secondary">OpenAI API Key</label>
                                    <p className="text-xs text-secondary">Chave compartilhada por todos os perfis de e-mail do workspace.</p>
                                    <div className="relative">
                                        <Input
                                            type={showOpenaiKey ? 'text' : 'password'}
                                            value={openaiKey}
                                            onChange={(e) => setOpenaiKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOpenaiKey(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                                        >
                                            {showOpenaiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <Button onClick={handleSaveWorkspace} isLoading={loading}>
                                    Salvar Alterações
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Membros */}
                    {activeTab === 'equipe' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Membros da Equipe</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                <form onSubmit={handleInvite} className="flex gap-3">
                                    <Input
                                        placeholder="Endereço de e-mail"
                                        className="flex-1"
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                    />
                                    <Button type="submit" variant="ghost">Convidar</Button>
                                </form>

                                <div className="space-y-3">
                                    {members.map((member, idx) => {
                                        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                                        if (!profile) return null;
                                        return (
                                            <div key={idx} className="flex items-center justify-between p-3 border border-border-subtle rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold uppercase">
                                                        {profile.full_name?.substring(0, 2) || profile.email?.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-primary">{profile.full_name || 'Usuário Pendente'}</p>
                                                        <p className="text-xs text-secondary">{profile.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <Badge variant={member.role as any}>
                                                        {member.role}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                            </CardContent>
                        </Card>
                    )}

                    {/* Fluxo de Trabalho (Workflow / Status) */}
                    {activeTab === 'fluxo' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Layout size={20} className="text-brand" />
                                        Configuração do Funil
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-4 bg-brand-light border border-border-subtle rounded-lg">
                                        <p className="text-xs text-brand leading-relaxed">
                                            <strong>Dica:</strong> Defina as etapas do seu processo (Ex: Briefing, Em Produção, Revisão).
                                            As tarefas se movem da esquerda para a direita no Kanban seguindo esta ordem.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-surface-0 border border-border-subtle rounded-lg space-y-2">
                                        <p className="text-xs font-black text-muted uppercase tracking-widest">Comportamento automático</p>
                                        <div className="flex items-start gap-2">
                                            <span className="mt-0.5 w-2 h-2 rounded-full bg-brand shrink-0" />
                                            <p className="text-xs text-secondary leading-relaxed">
                                                <strong className="text-primary">1º status</strong> — ponto de entrada das novas tarefas. Tarefas com prazo vencido (hoje ou anterior) são movidas automaticamente para cá ao abrir o app.
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="mt-0.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />
                                            <p className="text-xs text-secondary leading-relaxed">
                                                <strong className="text-primary">Último status</strong> — sempre considerado como "Concluído". Marcar uma tarefa como feita a move para cá.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Add New Status */}
                                    {!editingStatusId && (
                                        <div className="flex gap-3 items-end p-4 border border-dashed border-border-subtle rounded-card">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-bold text-secondary uppercase">Novo Status</label>
                                                <Input
                                                    placeholder="Ex: Aguardando Feedback"
                                                    value={statusName}
                                                    onChange={(e) => setStatusName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-secondary uppercase">Cor</label>
                                                <input
                                                    type="color"
                                                    value={statusColor}
                                                    onChange={(e) => setStatusColor(e.target.value)}
                                                    className="block w-10 h-10 border-0 p-0.5 rounded cursor-pointer bg-transparent"
                                                />
                                            </div>
                                            <Button onClick={handleAddStatus} isLoading={loading} className="gap-2">
                                                <Plus size={16} /> Adicionar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Status List */}
                                    <div className="space-y-3">
                                        {statuses.length === 0 ? (
                                            <div className="p-10 text-center border border-dashed border-border-subtle rounded-lg">
                                                <p className="text-sm text-secondary italic">Nenhum status configurado. O sistema usará o padrão (A Fazer para Entregue).</p>
                                            </div>
                                        ) : (
                                            statuses.map((status, index) => (
                                                <div
                                                    key={status.id}
                                                    className={`flex items-center justify-between p-4 border rounded-card transition-all ${editingStatusId === status.id ? 'border-brand ring-2 ring-brand/10 bg-brand/5' : 'border-border-subtle bg-white hover:border-border-subtle'}`}
                                                >
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => moveStatus(status.id, 'up')}
                                                                disabled={index === 0}
                                                                className="text-muted hover:text-primary disabled:opacity-20"
                                                            >
                                                                <GripVertical size={14} className="rotate-0" />
                                                            </button>
                                                            <button
                                                                onClick={() => moveStatus(status.id, 'down')}
                                                                disabled={index === statuses.length - 1}
                                                                className="text-muted hover:text-primary disabled:opacity-20"
                                                            >
                                                                <GripVertical size={14} className="rotate-180" />
                                                            </button>
                                                        </div>

                                                        {editingStatusId === status.id ? (
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <Input
                                                                    value={statusName}
                                                                    onChange={(e) => setStatusName(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <input
                                                                    type="color"
                                                                    value={statusColor}
                                                                    onChange={(e) => setStatusColor(e.target.value)}
                                                                    className="w-8 h-8 rounded border-0 cursor-pointer"
                                                                />
                                                                <Button size="sm" onClick={() => handleUpdateStatus(status.id)}>Salvar</Button>
                                                                <Button size="sm" variant="ghost" onClick={() => setEditingStatusId(null)}>Cancelar</Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color || '#ccc' }} />
                                                                <span className="font-bold text-primary text-sm">{status.name}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {!editingStatusId && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => startEditing(status)}
                                                                className="p-2 text-muted hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                                                            >
                                                                <Settings2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStatus(status.id)}
                                                                className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Categorias / Tipos de Tarefa */}
                    {activeTab === 'categorias' && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Palette size={20} className="text-brand" />
                                            Tipos de Tarefa
                                        </CardTitle>
                                        {taskCategories.length === 0 && (
                                            <Button variant="ghost" size="sm" onClick={loadDefaultCategories} disabled={loading}>
                                                Carregar Padrões
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="p-4 bg-brand-light border border-border-subtle rounded-lg">
                                        <p className="text-xs text-brand leading-relaxed">
                                            Classifique suas tarefas por especialidade ou tipo de entrega. Isso ajuda na organização e visualização do volume de trabalho por área.
                                        </p>
                                    </div>

                                    {/* Add New Category */}
                                    {!editingCategoryId && (
                                        <div className="flex gap-3 items-end p-4 border border-dashed border-border-subtle rounded-card">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-bold text-secondary uppercase">Novo Tipo</label>
                                                <Input
                                                    placeholder="Ex: Tráfego Pago"
                                                    value={categoryName}
                                                    onChange={(e) => setCategoryName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-secondary uppercase">Cor</label>
                                                <input
                                                    type="color"
                                                    value={categoryColor}
                                                    onChange={(e) => setCategoryColor(e.target.value)}
                                                    className="block w-10 h-10 border-0 p-0.5 rounded cursor-pointer bg-transparent"
                                                />
                                            </div>
                                            <Button onClick={handleAddCategory} isLoading={loading} className="gap-2">
                                                <Plus size={16} /> Adicionar
                                            </Button>
                                        </div>
                                    )}

                                    {/* Categories List */}
                                    <div className="space-y-3">
                                        {taskCategories.map((category) => (
                                            <div
                                                key={category.id}
                                                className={`flex items-center justify-between p-4 border rounded-card transition-all ${editingCategoryId === category.id ? 'border-brand ring-2 ring-brand/10 bg-brand/5' : 'border-border-subtle bg-white hover:border-border-subtle'}`}
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    {editingCategoryId === category.id ? (
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <Input
                                                                value={categoryName}
                                                                onChange={(e) => setCategoryName(e.target.value)}
                                                                autoFocus
                                                            />
                                                            <input
                                                                type="color"
                                                                value={categoryColor}
                                                                onChange={(e) => setCategoryColor(e.target.value)}
                                                                className="w-8 h-8 rounded border-0 cursor-pointer"
                                                            />
                                                            <Button size="sm" onClick={() => handleUpdateCategory(category.id)}>Salvar</Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancelar</Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color || '#ccc' }} />
                                                            <span className="font-bold text-primary text-sm">{category.name}</span>
                                                        </>
                                                    )}
                                                </div>

                                                {!editingCategoryId && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => startEditingCategory(category)}
                                                            className="p-2 text-muted hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                                                        >
                                                            <Settings2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(category.id)}
                                                            className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Aparência */}
                    {activeTab === 'aparencia' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Paintbrush size={20} className="text-brand" />
                                    Aparência
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Dark Mode Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface-0">
                                    <div className="flex items-center gap-3">
                                        {darkMode ? <Moon size={18} className="text-brand" /> : <Sun size={18} className="text-secondary" />}
                                        <div>
                                            <p className="text-sm font-bold text-primary">Modo Escuro</p>
                                            <p className="text-xs text-muted">Alterna entre tema claro e escuro</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={toggleDarkMode}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none ${darkMode ? 'bg-brand' : 'bg-border-subtle'}`}
                                        role="switch"
                                        aria-checked={darkMode}
                                    >
                                        <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                {/* Layout Themes */}
                                <div>
                                    <p className="text-sm text-secondary mb-4">Escolha o estilo visual da interface. A troca é instantânea e salva automaticamente.</p>
                                    <div className="grid grid-cols-1 gap-3">
                                        {THEMES.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTheme(t.id)}
                                                className={`flex items-center justify-between p-4 rounded-[var(--radius-card)] border-2 text-left transition-all ${
                                                    theme === t.id
                                                        ? 'border-brand bg-brand-light'
                                                        : 'border-border-subtle hover:border-border-subtle bg-white'
                                                }`}
                                            >
                                                <div>
                                                    <p className={`text-sm font-bold ${theme === t.id ? 'text-brand' : 'text-primary'}`}>{t.label}</p>
                                                    <p className="text-xs text-secondary mt-0.5">{t.description}</p>
                                                </div>
                                                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${theme === t.id ? 'border-brand bg-brand' : 'border-border-subtle'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>
        </div>
    );
}
