interface CheckItem {
    label: string;
    ok: boolean;
    blocking: boolean;
}

interface Props {
    checks: CheckItem[];
    canSend: boolean;
    scheduleEnabled: boolean;
    scheduledAt: string;
    onClose: () => void;
    onConfirm: () => void;
}

export function EmailChecklistModal({ checks, canSend, scheduleEnabled, scheduledAt, onClose, onConfirm }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-surface-card rounded-card shadow-modal border border-border-subtle w-full max-w-sm mx-4 p-6">
                <h3 className="text-base font-semibold text-primary mb-1">Antes de exportar</h3>
                <p className="text-xs text-muted mb-5">Revise os itens abaixo antes de enviar para o Mailchimp.</p>

                <div className="space-y-3 mb-5">
                    {checks.map((check, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${check.ok ? 'bg-green-100 text-green-600' : check.blocking ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                                {check.ok ? '✓' : check.blocking ? '✗' : '!'}
                            </span>
                            <span className={`text-sm leading-snug ${check.ok ? 'text-secondary' : check.blocking ? 'text-red-600 font-medium' : 'text-amber-700'}`}>
                                {check.label}
                            </span>
                        </div>
                    ))}
                </div>

                {scheduleEnabled && scheduledAt && (
                    <div className="text-xs text-secondary mb-4 bg-surface-2 rounded-lg px-3 py-2.5">
                        📅 Agendado para {new Date(scheduledAt).toLocaleString('pt-BR')}
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 h-9 rounded-lg border border-border-subtle text-sm text-secondary hover:bg-surface-2 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!canSend}
                        className="flex-1 h-9 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                    >
                        {canSend ? 'Exportar →' : 'Corrija os erros'}
                    </button>
                </div>
            </div>
        </div>
    );
}
