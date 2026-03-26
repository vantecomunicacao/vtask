import type { SectionKey } from '../../pages/GeradorEmail';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    prompt: string;
    onPromptChange: (v: string) => void;
    loading: boolean;
    onGenerate: () => void;
}

export function EmailIASection({
    openSections, toggle,
    prompt, onPromptChange,
    loading, onGenerate,
}: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Conteúdo IA" sectionKey="ia" openSections={openSections} toggle={toggle} />
            {openSections.ia && (
                <div className="px-5 pb-5 space-y-3">
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
