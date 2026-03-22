import { ChevronDown, ChevronRight, Play, Pause, Edit, Trash2 } from 'lucide-react';
import type { EmailSchedule } from './emailTypes';
import { TEMPLATES, describeCron } from './emailTypes';

interface Props {
    schedules: EmailSchedule[];
    expandedSchedule: string | null;
    onToggleExpand: (id: string) => void;
    onToggle: (s: EmailSchedule) => void;
    onEdit: (s: EmailSchedule) => void;
    onDelete: (id: string) => void;
}

export function ProfileScheduleList({ schedules, expandedSchedule, onToggleExpand, onToggle, onEdit, onDelete }: Props) {
    if (schedules.length === 0) {
        return <p className="text-xs text-gray-400 py-2">Nenhum agendamento configurado</p>;
    }
    return (
        <div className="space-y-2">
            {schedules.map(s => (
                <div key={s.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
                        <button
                            onClick={() => onToggleExpand(s.id)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            {expandedSchedule === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.name}</span>
                        <span className="text-xs text-gray-500">{describeCron(s.cron_expression)}</span>
                        <button
                            onClick={() => onToggle(s)}
                            className={`p-1 rounded ${s.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={s.active ? 'Pausar' : 'Ativar'}
                        >
                            {s.active ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button
                            onClick={() => onEdit(s)}
                            className="p-1 rounded text-brand hover:bg-brand-light"
                            title="Editar"
                        >
                            <Edit size={13} />
                        </button>
                        <button
                            onClick={() => onDelete(s.id)}
                            className="p-1 rounded text-red-400 hover:bg-red-50"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                    {expandedSchedule === s.id && (
                        <div className="px-4 py-3 text-xs text-gray-600 space-y-1 bg-white">
                            <p><span className="font-medium">Template:</span> {TEMPLATES.find(t => t.id === s.template_id)?.label ?? s.template_id}</p>
                            <p><span className="font-medium">Cron:</span> <code className="bg-gray-100 px-1 rounded">{s.cron_expression}</code></p>
                            {s.last_run_at && <p><span className="font-medium">Última execução:</span> {new Date(s.last_run_at).toLocaleString('pt-BR')}</p>}
                            {s.next_run_at && <p><span className="font-medium">Próxima:</span> {new Date(s.next_run_at).toLocaleString('pt-BR')}</p>}
                            {s.button_link && <p><span className="font-medium">Link CTA:</span> {s.button_link}</p>}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
