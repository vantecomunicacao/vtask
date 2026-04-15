import { Select } from '../ui/Select';
import type { MailchimpList } from '../../lib/emailTypes';
import type { SectionKey } from '../../pages/GeradorEmail';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    mailchimpLists: MailchimpList[];
    selectedListId: string;
    onListChange: (id: string) => void;
    subject: string;
    onSubjectChange: (v: string) => void;
    previewText: string;
    onPreviewTextChange: (v: string) => void;
    scheduleEnabled: boolean;
    onScheduleToggle: () => void;
    scheduledAt: string;
    onScheduledAtChange: (v: string) => void;
    suggestingSubject: boolean;
    onSuggestSubject: () => void;
    canSuggest: boolean;
    onSendTestEmail: () => void;
    sendingTest: boolean;
    testEmail?: string | null;
}

export function EmailEnvioSection({
    openSections, toggle,
    mailchimpLists, selectedListId, onListChange,
    subject, onSubjectChange,
    previewText, onPreviewTextChange,
    scheduleEnabled, onScheduleToggle, scheduledAt, onScheduledAtChange,
    suggestingSubject, onSuggestSubject, canSuggest,
    onSendTestEmail, sendingTest, testEmail,
}: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Configurações de Envio" sectionKey="envio" openSections={openSections} toggle={toggle} />
            {openSections.envio && (
                <div className="px-5 pb-5 space-y-4">

                    {/* Público */}
                    <div>
                        <Select label="Público (Mailchimp)" value={selectedListId} onChange={e => onListChange(e.target.value)}>
                            <option value="">Selecione um público...</option>
                            {mailchimpLists.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.count} contatos)</option>
                            ))}
                        </Select>
                        {mailchimpLists.length === 0 && (
                            <p className="text-[11px] text-muted mt-1">Servidor local não conectado ou sem listas.</p>
                        )}
                    </div>

                    {/* Botão de Teste */}
                    <button
                        onClick={onSendTestEmail}
                        disabled={sendingTest}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand border border-brand/30 rounded-lg hover:bg-brand/5 disabled:opacity-40 transition-colors"
                    >
                        {sendingTest ? '⏳ Enviando...' : `✉️ Enviar teste${testEmail ? ` → ${testEmail}` : ''}`}
                    </button>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-secondary">Assunto</label>
                            <div className="flex items-center gap-2.5">
                                <span className={`text-[11px] ${subject.length > 60 ? 'text-red-400 font-medium' : 'text-muted'}`}>
                                    {subject.length}/60
                                </span>
                                <button
                                    onClick={onSuggestSubject}
                                    disabled={suggestingSubject || !canSuggest}
                                    className="text-[11px] text-brand hover:underline disabled:opacity-40 font-medium"
                                >
                                    {suggestingSubject ? '...' : '⚡ Sugerir'}
                                </button>
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="Linha de assunto do e-mail"
                            value={subject}
                            onChange={e => onSubjectChange(e.target.value)}
                            className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>

                    {/* Texto de Prévia */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-secondary">Texto de Prévia</label>
                            <span className={`text-[11px] ${previewText.length > 130 ? 'text-red-400 font-medium' : 'text-muted'}`}>
                                {previewText.length}/130
                            </span>
                        </div>
                        <input
                            type="text"
                            placeholder="Snippet exibido antes de abrir o e-mail..."
                            value={previewText}
                            onChange={e => onPreviewTextChange(e.target.value)}
                            className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>

                    {/* Horário de Envio */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-secondary">Horário de Envio</label>
                            <button
                                onClick={onScheduleToggle}
                                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${scheduleEnabled ? 'bg-brand' : 'bg-surface-0'}`}
                            >
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${scheduleEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>
                        {scheduleEnabled ? (
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={e => onScheduledAtChange(e.target.value)}
                                className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                            />
                        ) : (
                            <p className="text-[11px] text-muted">Envio imediato ao exportar</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
