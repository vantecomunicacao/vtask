import { Select } from '../ui/Select';
import type { ScheduleFormData } from '../../lib/emailTypes';
import { TEMPLATES, CRON_PRESETS } from '../../lib/emailTypes';

interface Props {
    editingScheduleId: string | null;
    scheduleForm: ScheduleFormData;
    onScheduleFormChange: (f: ScheduleFormData) => void;
    cronPreset: string;
    onCronPresetChange: (v: string) => void;
    customCron: string;
    onCustomCronChange: (v: string) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export function ProfileScheduleForm({
    editingScheduleId,
    scheduleForm, onScheduleFormChange,
    cronPreset, onCronPresetChange,
    customCron, onCustomCronChange,
    onSubmit, onCancel,
}: Props) {
    const set = (patch: Partial<ScheduleFormData>) => onScheduleFormChange({ ...scheduleForm, ...patch });

    return (
        <div className="mt-3 p-4 border border-brand/30 rounded-lg bg-brand-light space-y-3">
            <h4 className="text-xs font-semibold text-brand">
                {editingScheduleId ? 'Editar agendamento' : 'Novo agendamento'}
            </h4>

            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                <input
                    type="text"
                    value={scheduleForm.name}
                    onChange={e => set({ name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="Ex: Newsletter semanal"
                />
            </div>

            <div>
                <Select label="Frequência" value={cronPreset} onChange={e => onCronPresetChange(e.target.value)}>
                    {CRON_PRESETS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </Select>
                {cronPreset === '__custom__' && (
                    <input
                        type="text"
                        value={customCron}
                        onChange={e => onCustomCronChange(e.target.value)}
                        className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="0 9 * * 1"
                    />
                )}
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Select label="Template" value={scheduleForm.template_id} onChange={e => set({ template_id: e.target.value })}>
                    {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor do botão</label>
                    <input
                        type="color"
                        value={scheduleForm.button_color}
                        onChange={e => set({ button_color: e.target.value })}
                        className="w-full h-9 rounded border border-gray-200 cursor-pointer"
                    />
                </div>
            </div>

            <label className="flex items-center gap-2 mb-4 p-3 bg-brand-light/50 border border-brand/20 rounded-lg cursor-pointer hover:bg-brand-light transition-colors">
                <input
                    type="checkbox"
                    checked={scheduleForm.is_dynamic_theme}
                    onChange={e => set({ is_dynamic_theme: e.target.checked })}
                    className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand/30"
                />
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                        🤖 IA Orquestradora de Temas
                    </span>
                    <span className="text-[11px] text-gray-500">
                        A IA fará a gestão para você: ela vai ler o primeiro tema da sua "Lista de Temas" no Perfil, usar para gerar este e-mail semanal e apagar da lista.
                    </span>
                </div>
            </label>

            {!scheduleForm.is_dynamic_theme && (
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Prompt personalizado (opcional)</label>
                    <textarea
                        value={scheduleForm.prompt_override ?? ''}
                        onChange={e => set({ prompt_override: e.target.value })}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                        placeholder="Deixe vazio para usar o prompt do perfil..."
                    />
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Texto do botão CTA</label>
                    <input
                        type="text"
                        value={scheduleForm.button_text ?? ''}
                        onChange={e => set({ button_text: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        placeholder="Saiba mais"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link do botão</label>
                    <input
                        type="text"
                        value={scheduleForm.button_link ?? ''}
                        onChange={e => set({ button_link: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        placeholder="https://..."
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={onSubmit}
                    className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90"
                >
                    {editingScheduleId ? 'Salvar Edição' : 'Criar agendamento'}
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-lg"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
