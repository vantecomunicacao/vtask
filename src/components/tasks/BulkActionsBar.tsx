import { CheckCircle, CheckCircle2, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
    selectedCount: number;
    onCompleteAll: () => void;
    onDeleteAll: () => void;
    onCancel: () => void;
}

export function BulkActionsBar({ selectedCount, onCompleteAll, onDeleteAll, onCancel }: BulkActionsBarProps) {
    if (selectedCount === 0) return null;
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 floating-bar-enter bg-gray-900/95 backdrop-blur-xl text-white px-6 py-3 rounded-card shadow-modal z-50 flex items-center gap-6 border border-white/10">
            <div className="flex items-center gap-2 border-r border-gray-700 pr-6">
                <CheckCircle size={18} className="text-brand" />
                <span className="text-sm font-black tracking-widest">{selectedCount} SELECIONADAS</span>
            </div>
            <div className="flex items-center gap-5">
                <button
                    onClick={onCompleteAll}
                    className="flex items-center gap-1.5 text-xs font-bold hover:text-brand transition-colors duration-200 tracking-widest uppercase"
                >
                    <CheckCircle2 size={16} /> Concluir
                </button>
                <button
                    onClick={onDeleteAll}
                    className="flex items-center gap-1.5 text-xs font-bold hover:text-red-400 transition-colors duration-200 tracking-widest uppercase"
                >
                    <Trash2 size={16} /> Excluir
                </button>
                <button
                    onClick={onCancel}
                    className="text-xs font-bold text-secondary hover:text-white transition-colors duration-200 tracking-widest uppercase"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
