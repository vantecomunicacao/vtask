import { Eye, EyeOff } from 'lucide-react';
import type { EmailProfile, SectionKey } from './emailTypes';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    openaiKey: string;
    onOpenaiKeyChange: (v: string) => void;
    showOpenaiKey: boolean;
    onToggleShowKey: () => void;
    savingOpenaiKey: boolean;
    onSaveKey: () => void;
    selectedProfile: EmailProfile | null;
    prompt: string;
    onPromptChange: (v: string) => void;
    loading: boolean;
    onGenerate: () => void;
}

export function EmailIASection({
    openSections, toggle,
    openaiKey, onOpenaiKeyChange,
    showOpenaiKey, onToggleShowKey,
    savingOpenaiKey, onSaveKey,
    selectedProfile,
    prompt, onPromptChange,
    loading, onGenerate,
}: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Conteúdo IA" sectionKey="ia" openSections={openSections} toggle={toggle} />
            {openSections.ia && (
                <div className="px-5 pb-5 space-y-3">
                    {/* OpenAI API Key */}
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1.5">OpenAI API Key</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={showOpenaiKey ? 'text' : 'password'}
                                    value={openaiKey}
                                    onChange={e => onOpenaiKeyChange(e.target.value)}
                                    placeholder="sk-..."
                                    className="w-full h-9 rounded-md border border-border-subtle px-3 pr-8 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <button
                                    type="button"
                                    onClick={onToggleShowKey}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-secondary"
                                >
                                    {showOpenaiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                            {selectedProfile && (
                                <button
                                    onClick={onSaveKey}
                                    disabled={savingOpenaiKey}
                                    className="h-9 px-3 rounded-md border border-border-subtle text-xs text-secondary hover:bg-surface-2 disabled:opacity-50 flex-shrink-0"
                                >
                                    {savingOpenaiKey ? '...' : 'Salvar'}
                                </button>
                            )}
                        </div>
                    </div>
                    <textarea
                        className="w-full min-h-[100px] rounded-md border border-border-subtle px-3 py-2 text-sm placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Descreva o que a IA deve escrever..."
                        value={prompt}
                        onChange={e => onPromptChange(e.target.value)}
                    />
                    <button
                        onClick={onGenerate}
                        disabled={loading || !prompt}
                        className="w-full h-9 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-40"
                    >
                        {loading ? 'Gerando...' : 'Gerar E-mail com IA'}
                    </button>
                </div>
            )}
        </div>
    );
}
