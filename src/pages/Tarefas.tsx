import { Button } from '../components/ui/Button';
import { MoreHorizontal, Calendar as CalendarIcon, Flag } from 'lucide-react';

export default function Tarefas() {
    return (
        <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Minhas Tarefas</h1>
                <Button size="sm" className="gap-2">
                    <span className="text-lg leading-none">+</span> Nova Tarefa
                </Button>
            </div>

            <div className="flex-1 bg-white border border-border-subtle rounded-xl overflow-hidden flex flex-col">
                {/* Header List */}
                <div className="bg-bg-main border-b border-border-subtle px-4 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <div className="col-span-6">Tarefa</div>
                    <div className="col-span-2">Projeto</div>
                    <div className="col-span-2">Prazo</div>
                    <div className="col-span-1">Prioridade</div>
                    <div className="col-span-1 text-right">Ações</div>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">

                    <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center group hover:bg-gray-50 transition-colors">
                        <div className="col-span-6 flex items-center gap-3">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer" />
                            <span className="text-sm font-medium text-gray-900 group-hover:text-brand transition-colors cursor-pointer">
                                Revisar copy da landing page
                            </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                            <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-100 rounded-md"># Rebranding Vante</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-xs text-red-600 font-medium">
                            <CalendarIcon size={14} /> Hoje
                        </div>
                        <div className="col-span-1 flex items-center">
                            <span className="flex items-center gap-1 text-xs text-brand font-medium"><Flag size={12} className="fill-brand" /> Alta</span>
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center group hover:bg-gray-50 transition-colors">
                        <div className="col-span-6 flex items-center gap-3">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-brand transition-colors cursor-pointer">
                                Aprovar criativos campanha Ads
                            </span>
                        </div>
                        <div className="col-span-2 flex items-center">
                            <span className="text-xs font-medium text-gray-600 px-2 py-1 bg-gray-100 rounded-md"># Ads FB</span>
                        </div>
                        <div className="col-span-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <CalendarIcon size={14} /> Amanhã
                        </div>
                        <div className="col-span-1 flex items-center">
                            <span className="flex items-center gap-1 text-xs text-orange-500 font-medium"><Flag size={12} className="fill-orange-500 text-orange-500" /> Média</span>
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button className="text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
