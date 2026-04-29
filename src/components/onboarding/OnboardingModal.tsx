import { useState } from 'react';
import { CheckCircle, ChevronRight, Folder, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useProjectStore } from '../../store/projectStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const PRESET_COLORS = ['#db4035', '#ff7043', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

const STEPS = ['Bem-vindo', 'Primeiro projeto', 'Pronto!'];

export function OnboardingModal() {
    const { activeWorkspace, setShowOnboarding, fetchWorkspaces } = useWorkspaceStore();
    const { fetchProjects } = useProjectStore();

    const [step, setStep] = useState(0);
    const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name ?? '');
    const [projectName, setProjectName] = useState('');
    const [projectColor, setProjectColor] = useState(PRESET_COLORS[0]);
    const [loading, setLoading] = useState(false);

    if (!activeWorkspace) return null;

    const handleFinishStep0 = async () => {
        const name = workspaceName.trim();
        if (!name) return;
        if (name !== activeWorkspace.name) {
            await supabase.from('workspaces').update({ name }).eq('id', activeWorkspace.id);
            await fetchWorkspaces();
        }
        setStep(1);
    };

    const handleFinishStep1 = async () => {
        const name = projectName.trim();
        if (!name) { toast.error('Dê um nome ao projeto'); return; }
        setLoading(true);
        const { error } = await supabase.from('projects').insert({
            workspace_id: activeWorkspace.id,
            name,
            color: projectColor,
        });
        setLoading(false);
        if (error) { toast.error('Erro ao criar projeto'); return; }
        await fetchProjects(activeWorkspace.id);
        setStep(2);
    };

    const handleDone = () => setShowOnboarding(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
            <div className="w-full max-w-md bg-surface-card rounded-card shadow-modal overflow-hidden popup-spring">

                {/* Progress bar */}
                <div className="h-1 bg-surface-0">
                    <div
                        className="h-full bg-brand transition-all duration-500"
                        style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Steps indicator */}
                <div className="flex items-center justify-center gap-2 pt-5 px-6">
                    {STEPS.map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                                i < step ? 'bg-brand text-white' :
                                i === step ? 'bg-brand text-white' :
                                'bg-surface-0 text-muted border border-border-subtle'
                            )}>
                                {i < step ? <CheckCircle size={12} /> : i + 1}
                            </div>
                            <span className={cn(
                                'text-xs font-medium hidden sm:block',
                                i === step ? 'text-primary' : 'text-muted'
                            )}>{label}</span>
                            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-border-subtle" />}
                        </div>
                    ))}
                </div>

                <div className="p-6">
                    {/* Step 0 — Welcome */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <div>
                                <h2 className="text-xl font-bold text-primary">Bem-vindo ao VTask!</h2>
                                <p className="text-sm text-secondary mt-1">Seu workspace foi criado. Vamos deixá-lo com a sua cara.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Nome do workspace
                                </label>
                                <Input
                                    value={workspaceName}
                                    onChange={e => setWorkspaceName(e.target.value)}
                                    placeholder="Ex: Agência XYZ"
                                    onKeyDown={e => e.key === 'Enter' && handleFinishStep0()}
                                    autoFocus
                                />
                            </div>
                            <Button
                                onClick={handleFinishStep0}
                                disabled={!workspaceName.trim()}
                                className="w-full"
                            >
                                Continuar
                            </Button>
                        </div>
                    )}

                    {/* Step 1 — First project */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Folder size={18} className="text-brand" />
                                    <h2 className="text-xl font-bold text-primary">Crie seu primeiro projeto</h2>
                                </div>
                                <p className="text-sm text-secondary">Projetos organizam as tarefas da sua equipe.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1.5">
                                    Nome do projeto
                                </label>
                                <Input
                                    value={projectName}
                                    onChange={e => setProjectName(e.target.value)}
                                    placeholder="Ex: Site Institucional"
                                    onKeyDown={e => e.key === 'Enter' && handleFinishStep1()}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary mb-2">
                                    Cor do projeto
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {PRESET_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setProjectColor(color)}
                                            className={cn(
                                                'w-7 h-7 rounded-full transition-transform',
                                                projectColor === color && 'ring-2 ring-offset-2 ring-brand scale-110'
                                            )}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Cor ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setStep(2)}
                                    className="text-sm text-muted hover:text-secondary transition-colors"
                                >
                                    Pular por agora
                                </button>
                                <Button
                                    onClick={handleFinishStep1}
                                    disabled={!projectName.trim() || loading}
                                    className="flex-1"
                                >
                                    {loading ? 'Criando...' : 'Criar projeto'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Done */}
                    {step === 2 && (
                        <div className="text-center space-y-5 py-2">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-light mx-auto">
                                <Sparkles size={28} className="text-brand" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-primary">Tudo pronto!</h2>
                                <p className="text-sm text-secondary mt-1">
                                    Seu workspace <span className="font-semibold text-primary">{activeWorkspace.name}</span> está configurado.
                                    Comece criando tarefas e colaborando com sua equipe.
                                </p>
                            </div>
                            <Button onClick={handleDone} className="w-full">
                                Ir para o Dashboard
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
