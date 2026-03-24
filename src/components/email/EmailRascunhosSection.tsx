import type { EmailDraft } from '../../lib/emailTypes';
import type { SectionKey } from '../../pages/GeradorEmail';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    drafts: EmailDraft[];
    onLoad: (draft: EmailDraft) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    formatDate: (iso: string) => string;
}

export function EmailRascunhosSection({ openSections, toggle, drafts, onLoad, onDelete, formatDate }: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Rascunhos" sectionKey="rascunhos" openSections={openSections} toggle={toggle} badge={drafts.length} />
            {openSections.rascunhos && (
                <div className="divide-y max-h-52 overflow-y-auto">
                    {drafts.length === 0 ? (
                        <p className="text-xs text-muted text-center py-5">Nenhum rascunho salvo.</p>
                    ) : drafts.map(draft => (
                        <div
                            key={draft.id}
                            onClick={() => onLoad(draft)}
                            className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 cursor-pointer group"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">{draft.name}</p>
                                <p className="text-[11px] text-muted">{draft.template_id} · {formatDate(draft.created_at || new Date().toISOString())}</p>
                            </div>
                             <button
                                 onClick={e => draft.id && onDelete(draft.id, e)}
                                 className="ml-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-sm"
                             >🗑️</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
