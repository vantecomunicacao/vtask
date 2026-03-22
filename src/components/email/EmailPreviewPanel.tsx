import type { RefObject } from 'react';

interface Props {
    result: { subject: string; body: string } | null;
    mobilePreview: boolean;
    iframeRef: RefObject<HTMLIFrameElement | null>;
    isEditing: boolean;
    onToggleEditMode: () => void;
    finalSubject: string;
    loading: boolean;
}

export function EmailPreviewPanel({ result, mobilePreview, iframeRef, isEditing, onToggleEditMode, finalSubject, loading }: Props) {
    if (!result) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted">
                <div className="h-16 w-16 bg-surface-card shadow-card rounded-full flex items-center justify-center mb-4 border border-border-subtle">
                    <span className="text-2xl">✉️</span>
                </div>
                <h3 className="text-base font-medium text-secondary mb-1">Preview aparecerá aqui</h3>
                <p className="text-sm max-w-xs">Configure o design, escreva o prompt e clique em "Gerar E-mail com IA".</p>
            </div>
        );
    }

    return (
        <>
            {/* Preview toolbar */}
            <div className="flex-shrink-0 h-12 bg-surface-card border-b border-border-subtle flex items-center px-4 gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted uppercase tracking-widest leading-none mb-0.5">Assunto</p>
                    <p className="text-sm font-medium text-primary truncate">{finalSubject || '(sem assunto)'}</p>
                </div>
                <button
                    onClick={onToggleEditMode}
                    disabled={loading}
                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-all flex-shrink-0 ${isEditing ? 'bg-brand text-white border-brand' : 'bg-surface-card text-secondary border-border-subtle hover:bg-surface-2'}`}
                >
                    {isEditing ? '✓ Salvar edições' : '✏️ Editar texto'}
                </button>
            </div>

            {/* iframe container */}
            <div className="flex-1 bg-[#f0f2f5] overflow-auto flex justify-center p-6">
                <div className={`bg-surface-card shadow-float rounded-sm overflow-hidden flex flex-col transition-all duration-300 ${mobilePreview ? 'w-[375px]' : 'w-full max-w-[650px]'}`}>
                    <iframe
                        ref={iframeRef}
                        srcDoc={result.body}
                        className="w-full flex-1 border-0 min-h-[700px]"
                        title="Preview do Email"
                    />
                </div>
            </div>
        </>
    );
}
