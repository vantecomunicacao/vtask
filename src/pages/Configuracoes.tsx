import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Building2, Users2, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function Configuracoes() {
    const { activeWorkspace, fetchWorkspaces } = useWorkspaceStore();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');

    useEffect(() => {
        if (activeWorkspace) {
            setName(activeWorkspace.name);
            loadMembers();
        }
    }, [activeWorkspace]);

    const loadMembers = async () => {
        if (!activeWorkspace) return;
        const { data } = await supabase
            .from('workspace_members')
            .select('role, profiles(id, full_name, email)')
            .eq('workspace_id', activeWorkspace.id);

        if (data) setMembers(data);
    };

    const handleSaveWorkspace = async () => {
        if (!activeWorkspace || !name.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('workspaces')
                .update({ name: name.trim() })
                .eq('id', activeWorkspace.id);

            if (error) throw error;
            toast.success('Workspace atualizado com sucesso!');
            await fetchWorkspaces();
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar workspace');
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        toast.info('Fluxo de convite será implementado no backend via Edge Function ou Server Action.');
        setInviteEmail('');
    };

    if (!activeWorkspace) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in h-full pb-10">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurações do Workspace</h1>
                <p className="text-sm text-gray-500">Gerencie detalhes da sua agência e os membros da sua equipe.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Lateral Menu do Settings */}
                <div className="col-span-1 space-y-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-brand">
                        <Building2 size={18} /> Geral
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                        <Users2 size={18} /> Equipe
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
                        <Palette size={18} /> Aparência (Em breve)
                    </button>
                </div>

                {/* Conteúdo do Settings */}
                <div className="col-span-1 md:col-span-2 space-y-6">

                    {/* Geral */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhes da Empresa</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">Nome do Workspace</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nome da sua agência"
                                />
                            </div>
                            <Button onClick={handleSaveWorkspace} isLoading={loading}>
                                Salvar Alterações
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Membros */}
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
                                    const profile = member.profiles;
                                    if (!profile) return null;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3 border border-border-subtle rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold uppercase">
                                                    {profile.full_name?.substring(0, 2) || profile.email?.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{profile.full_name || 'Usuário Pendente'}</p>
                                                    <p className="text-xs text-gray-500">{profile.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded-md">
                                                    {member.role}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
