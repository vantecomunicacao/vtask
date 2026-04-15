import { useState } from 'react';

interface Props {
    defaultName: string;
    onConfirm: (name: string) => void;
    onClose: () => void;
}

export function SaveDraftModal({ defaultName, onConfirm, onClose }: Props) {
    const [name, setName] = useState(defaultName || 'Meu Rascunho');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onConfirm(name.trim());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-base font-bold text-primary mb-1">Salvar Rascunho</h2>
                <p className="text-xs text-muted mb-4">Dê um nome para identificar este rascunho depois.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        autoFocus
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ex: Newsletter de Abril"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <div className="flex gap-2 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim()}
                            className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand/90 disabled:opacity-50 transition-colors"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
