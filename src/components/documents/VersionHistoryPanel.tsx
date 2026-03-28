import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, History, RotateCcw, Clock } from 'lucide-react';
import { useDocumentStore } from '../../store/documentStore';
import type { DocumentVersion } from '../../store/documentStore';

interface VersionHistoryPanelProps {
    documentId: string;
    currentTitle: string;
    onRestore: (version: DocumentVersion) => void;
    onClose: () => void;
}

export function VersionHistoryPanel({ documentId, currentTitle, onRestore, onClose }: VersionHistoryPanelProps) {
    const { versions, versionsLoading, fetchVersions } = useDocumentStore();

    useEffect(() => {
        fetchVersions(documentId);
    }, [documentId, fetchVersions]);

    const handleRestore = (version: DocumentVersion) => {
        const label = version.label ?? formatDate(version.created_at);
        if (window.confirm(`Restaurar versão de "${label}"?\nO conteúdo atual será substituído.`)) {
            onRestore(version);
        }
    };

    return (
        <div className="w-72 shrink-0 border-l border-border-subtle bg-surface-0 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <History size={15} className="text-brand" />
                    Histórico
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-[var(--radius-sm)] text-muted hover:text-primary hover:bg-surface-card transition-colors"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {versionsLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="w-5 h-5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
                    </div>
                ) : versions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-surface-card flex items-center justify-center">
                            <Clock size={18} className="text-muted" />
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                            Nenhuma versão salva ainda.
                            <br />
                            Use <kbd className="px-1 py-0.5 rounded bg-surface-card border border-border-subtle font-mono text-[10px]">Ctrl+S</kbd> para criar checkpoints.
                        </p>
                    </div>
                ) : (
                    <div className="p-2 flex flex-col gap-1">
                        {/* Versão atual (badge) */}
                        <div className="px-3 py-2.5 rounded-[var(--radius-card)] bg-brand/[0.06] border border-brand/20">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-brand truncate flex-1">{currentTitle || 'Sem título'}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-brand/10 text-brand px-1.5 py-0.5 rounded-full shrink-0">Atual</span>
                            </div>
                            <p className="text-[10px] text-muted mt-0.5">Versão em edição</p>
                        </div>

                        {/* Versões salvas */}
                        {versions.map((version, i) => (
                            <VersionItem
                                key={version.id}
                                version={version}
                                index={versions.length - i}
                                onRestore={handleRestore}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {versions.length > 0 && (
                <div className="px-4 py-2 border-t border-border-subtle shrink-0">
                    <p className="text-[10px] text-muted text-center">
                        {versions.length} versão{versions.length !== 1 ? 'ões' : ''} salva{versions.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
}

function VersionItem({ version, index, onRestore }: {
    version: DocumentVersion;
    index: number;
    onRestore: (v: DocumentVersion) => void;
}) {
    return (
        <div className="group px-3 py-2.5 rounded-[var(--radius-card)] hover:bg-surface-card border border-transparent hover:border-border-subtle transition-all">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary truncate">{version.title || 'Sem título'}</p>
                    <p className="text-[10px] text-muted mt-0.5">{formatDate(version.created_at)}</p>
                </div>
                <span className="text-[9px] font-bold text-muted/60 shrink-0 pt-0.5">v{index}</span>
            </div>
            <button
                onClick={() => onRestore(version)}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 py-1 rounded-[var(--radius-sm)] text-[10px] font-medium text-muted border border-border-subtle hover:border-brand/30 hover:text-brand hover:bg-brand/[0.03] transition-all opacity-0 group-hover:opacity-100"
            >
                <RotateCcw size={10} />
                Restaurar
            </button>
        </div>
    );
}

function formatDate(dateStr: string) {
    try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
        return dateStr;
    }
}
