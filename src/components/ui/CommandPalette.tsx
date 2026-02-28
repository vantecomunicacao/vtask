import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, PlusCircle, LayoutDashboard, Settings, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/40 backdrop-blur-sm p-4 fade-in">
            <div
                className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-border-subtle"
                onClick={(e) => e.stopPropagation()}
            >
                <Command label="Command Palette" className="flex flex-col h-full w-full bg-white">
                    <div className="flex items-center px-4 border-b border-border-subtle">
                        <Search className="w-5 h-5 text-gray-500 mr-2" />
                        <Command.Input
                            autoFocus
                            className="flex-1 h-14 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
                            placeholder="Digite um comando ou busque..."
                        />
                        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 font-medium px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 uppercase tracking-widest">
                            ESC
                        </button>
                    </div>

                    <Command.List className="max-h-[300px] overflow-y-auto p-2 scroll-smooth">
                        <Command.Empty className="p-6 text-center text-gray-500 text-sm">
                            Nenhum resultado encontrado.
                        </Command.Empty>

                        <Command.Group heading="Ações Rápidas" className="px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">
                            <Command.Item
                                onSelect={() => { setOpen(false); /* abir modal nova tarefa */ }}
                                className="flex items-center gap-2 px-3 py-3 mt-1 rounded-md cursor-pointer aria-selected:bg-brand-light aria-selected:text-brand text-sm text-gray-700 font-medium normal-case tracking-normal"
                            >
                                <PlusCircle className="h-4 w-4" />
                                Criar Nova Tarefa
                                <span className="ml-auto text-xs text-gray-400">C</span>
                            </Command.Item>
                        </Command.Group>

                        <Command.Group heading="Navegação" className="px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-widest">
                            <Command.Item
                                onSelect={() => { setOpen(false); navigate('/dashboard'); }}
                                className="flex items-center gap-2 px-3 py-3 mt-1 rounded-md cursor-pointer aria-selected:bg-gray-100 text-sm text-gray-700 font-medium normal-case tracking-normal"
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Ir para Dashboard
                            </Command.Item>
                            <Command.Item
                                onSelect={() => { setOpen(false); navigate('/projetos'); }}
                                className="flex items-center gap-2 px-3 py-3 mt-1 rounded-md cursor-pointer aria-selected:bg-gray-100 text-sm text-gray-700 font-medium normal-case tracking-normal"
                            >
                                <Folder className="h-4 w-4" />
                                Ir para Projetos
                            </Command.Item>
                            <Command.Item
                                onSelect={() => { setOpen(false); navigate('/configuracoes'); }}
                                className="flex items-center gap-2 px-3 py-3 mt-1 rounded-md cursor-pointer aria-selected:bg-gray-100 text-sm text-gray-700 font-medium normal-case tracking-normal"
                            >
                                <Settings className="h-4 w-4" />
                                Abrir Configurações
                            </Command.Item>
                        </Command.Group>
                    </Command.List>
                </Command>
            </div>
            <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
        </div>
    );
}
