import { Sparkles } from 'lucide-react';
import type { SectionKey } from '../../pages/GeradorEmail';
import { EmailSectionHeader } from './EmailSectionHeader';

const TONES = [
    { value: 'persuasivo', label: '🎯 Persuasivo', desc: 'Focado em conversão' },
    { value: 'urgente',    label: '⚡ Urgente',    desc: 'Senso de escassez' },
    { value: 'amigavel',   label: '😊 Amigável',   desc: 'Próximo do leitor' },
    { value: 'formal',     label: '🏛️ Formal',     desc: 'Institucional' },
    { value: 'criativo',   label: '🎨 Criativo',   desc: 'Surpreendente' },
] as const;

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    prompt: string;
    onPromptChange: (s: string) => void;
    loading: boolean;
    onGenerate: () => void;
    tone: string;
    onToneChange: (t: string) => void;
}

export function EmailIASection({ openSections, toggle, prompt, onPromptChange, loading, onGenerate, tone, onToneChange }: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Conteúdo com IA" sectionKey="ia" openSections={openSections} toggle={toggle} />
            {openSections.ia && (
                <div className="px-5 pb-5 space-y-4">
                    {/* Seletor de Tom */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tom de Voz</label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {TONES.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => onToneChange(t.value)}
                                    className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left transition-all ${
                                        tone === t.value
                                            ? 'border-brand bg-brand/5 text-brand'
                                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <span className="text-xs font-semibold leading-tight">{t.label}</span>
                                    <span className="text-[10px] text-gray-400 mt-0.5">{t.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tema do E-mail</label>
                        <textarea
                            value={prompt}
                            onChange={e => onPromptChange(e.target.value)}
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none custom-scrollbar"
                            placeholder="Ex: Lançamento de produto, promoção de fim de semana, newsletter mensal..."
                        />
                    </div>

                    <button
                        onClick={onGenerate}
                        disabled={loading || !prompt}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand/90 disabled:opacity-50 transition-colors"
                    >
                        <Sparkles size={15} className={loading ? 'animate-pulse' : ''} />
                        {loading ? 'Gerando...' : 'Gerar com IA'}
                    </button>
                </div>
            )}
        </div>
    );
}
