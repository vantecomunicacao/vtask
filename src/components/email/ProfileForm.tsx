import { Eye, EyeOff, RefreshCw, Trash2, Upload } from 'lucide-react';
import { Select } from '../ui/Select';
import type { ProfileFormData, MailchimpList } from '../../lib/emailTypes';
import { EMAIL_FONTS } from '../../lib/emailTypes';

interface Props {
    form: ProfileFormData;
    onFormChange: (f: ProfileFormData) => void;
    isNew: boolean;
    selectedId: string | null;
    showKey: boolean;
    onToggleShowKey: () => void;
    lists: MailchimpList[];
    loadingLists: boolean;
    onLoadLists: () => void;
    suggestingThemes: boolean;
    onSuggestThemes: () => void;
    uploadingImage: 'logo' | 'banner' | null;
    onImageUpload: (type: 'logo' | 'banner', file: File) => void;
    onImageDelete: (type: 'logo' | 'banner') => void;
    saving: boolean;
    onSave: () => void;
    onDelete: () => void;
    onUseProfile: () => void;
}

export function ProfileForm({
    form, onFormChange,
    isNew, selectedId,
    showKey, onToggleShowKey,
    lists, loadingLists, onLoadLists,
    suggestingThemes, onSuggestThemes,
    uploadingImage, onImageUpload, onImageDelete,
    saving, onSave, onDelete, onUseProfile,
}: Props) {
    const set = (patch: Partial<ProfileFormData>) => onFormChange({ ...form, ...patch });

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do perfil *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => set({ name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Ex: Acme Corp, Cliente X..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mailchimp API Key</label>
                    <div className="relative">
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={form.mailchimp_api_key ?? ''}
                            onChange={e => set({ mailchimp_api_key: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-brand/30"
                            placeholder="xxxx-us5"
                        />
                        <button
                            type="button"
                            onClick={onToggleShowKey}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Servidor (prefixo)</label>
                    <input
                        type="text"
                        value={form.mailchimp_server ?? 'us5'}
                        onChange={e => set({ mailchimp_server: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="us5"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Remetente</label>
                    <input
                        type="text"
                        value={form.sender_name ?? ''}
                        onChange={e => set({ sender_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Ex: Nome da Empresa"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail do Remetente</label>
                    <input
                        type="email"
                        value={form.sender_email ?? ''}
                        onChange={e => set({ sender_email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Ex: contato@empresa.com"
                    />
                </div>

                <div className="col-span-2">
                    <div className="flex gap-2">
                        <Select
                            value={form.mailchimp_list_id ?? ''}
                            onChange={e => set({ mailchimp_list_id: e.target.value })}
                            containerClassName="flex-1"
                        >
                            <option value="">Selecionar lista...</option>
                            {lists.map(l => (
                                <option key={l.id} value={l.id}>{l.name} ({l.count.toLocaleString()})</option>
                            ))}
                        </Select>
                        <button
                            onClick={onLoadLists}
                            disabled={loadingLists}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <RefreshCw size={13} className={loadingLists ? 'animate-spin' : ''} />
                            Carregar
                        </button>
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Instruções da Empresa (Nome, E-mail, Info Geral)</label>
                    <textarea
                        value={form.ai_prompt ?? ''}
                        onChange={e => set({ ai_prompt: e.target.value })}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                        placeholder="Ex: Nome: Vflow, E-mail: contato@vflow.com. Somos uma empresa de tecnologia focada em automação..."
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Texto do Botão Padrão</label>
                    <input
                        type="text"
                        value={form.default_button_text ?? ''}
                        onChange={e => set({ default_button_text: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="Ex: Saiba Mais"
                    />
                </div>
                <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link do Botão Padrão</label>
                    <input
                        type="url"
                        value={form.default_button_link ?? ''}
                        onChange={e => set({ default_button_link: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="https://..."
                    />
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail para Receber Testes Agendados</label>
                    <input
                        type="email"
                        value={form.test_email ?? ''}
                        onChange={e => set({ test_email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        placeholder="seu@email.com"
                    />
                </div>

                <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-gray-600">Lista de Temas (Inspirações/Sugestões)</label>
                        <button
                            onClick={onSuggestThemes}
                            disabled={suggestingThemes}
                            className="text-xs text-brand hover:text-brand/80 font-medium disabled:opacity-50"
                        >
                            {suggestingThemes ? 'Sugerindo...' : '✨ Sugerir Temas com IA'}
                        </button>
                    </div>
                    <textarea
                        value={form.themes_list ?? ''}
                        onChange={e => set({ themes_list: e.target.value })}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 resize-y custom-scrollbar"
                        placeholder="Anote aqui ideias de temas para os próximos e-mails..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor principal</label>
                    <div className="flex items-center gap-2">
                        <input type="color" value={form.brand_color} onChange={e => set({ brand_color: e.target.value })}
                            className="w-9 h-9 rounded cursor-pointer border border-gray-200" />
                        <input type="text" value={form.brand_color} onChange={e => set({ brand_color: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor do botão</label>
                    <div className="flex items-center gap-2">
                        <input type="color" value={form.button_color} onChange={e => set({ button_color: e.target.value })}
                            className="w-9 h-9 rounded cursor-pointer border border-gray-200" />
                        <input type="text" value={form.button_color} onChange={e => set({ button_color: e.target.value })}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/30" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Cor padrão dos botões de CTA nos emails</p>
                </div>

                <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Fonte dos e-mails</label>
                    <div className="grid grid-cols-2 gap-2">
                        {EMAIL_FONTS.map(f => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => set({ font_family: f.value })}
                                className={`px-3 py-2.5 rounded-lg border text-left transition-colors ${(form.font_family ?? EMAIL_FONTS[0].value) === f.value ? 'border-brand bg-brand/5 text-brand' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                            >
                                <span className="block text-sm" style={{ fontFamily: f.preview }}>{f.label}</span>
                                <span className="block text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: f.preview }}>Aa Bb Cc 123</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content settings */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600">Configurações de Conteúdo</p>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-700">Botão de CTA</p>
                            <p className="text-xs text-gray-500">Incluir botão de chamada para ação no email</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => set({ cta_enabled: !form.cta_enabled })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.cta_enabled ? 'bg-brand' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.cta_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Tamanho do email</p>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: 'short', label: 'Curto', desc: '~150 palavras' },
                                { value: 'medium', label: 'Médio', desc: '~300 palavras' },
                                { value: 'long', label: 'Longo', desc: '~500 palavras' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => set({ email_length: opt.value })}
                                    className={`flex flex-col items-center px-2 py-2.5 rounded-lg border text-xs transition-colors ${form.email_length === opt.value ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                >
                                    <span className="font-semibold">{opt.label}</span>
                                    <span className="text-[10px] mt-0.5 opacity-70">{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Image management */}
            {!isNew && selectedId && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600">Imagens do Perfil</p>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Logo */}
                        <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Logotipo</p>
                            <div className="flex items-center gap-3">
                                <div className="w-20 h-14 rounded-lg border border-gray-200 bg-white shadow-inner flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
                                    {form.logo_url ? (
                                        <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1 relative z-10" />
                                    ) : (
                                        <span className="text-[10px] text-gray-400 text-center leading-tight px-1 relative z-10 bg-white/80 rounded px-1">Sem imagem</span>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors ${uploadingImage === 'logo' ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <Upload size={12} />
                                        {uploadingImage === 'logo' ? 'Enviando...' : form.logo_url ? 'Substituir' : 'Fazer upload'}
                                        <input type="file" accept="image/*" className="hidden"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload('logo', f); e.target.value = ''; }} />
                                    </label>
                                    {form.logo_url && (
                                        <button onClick={() => onImageDelete('logo')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 size={12} /> Remover
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Banner */}
                        <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Banner Principal (topo)</p>
                            <div className="rounded-lg border border-gray-200 bg-white shadow-inner overflow-hidden mb-2 relative" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
                                {form.banner_url ? (
                                    <img src={form.banner_url} alt="Banner" className="w-full h-24 object-cover relative z-10" />
                                ) : (
                                    <div className="h-16 flex items-center justify-center relative z-10">
                                        <span className="text-[10px] text-gray-400 bg-white/80 rounded px-1">Sem banner</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors ${uploadingImage === 'banner' ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Upload size={12} />
                                    {uploadingImage === 'banner' ? 'Enviando...' : form.banner_url ? 'Substituir' : 'Fazer upload'}
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload('banner', f); e.target.value = ''; }} />
                                </label>
                                {form.banner_url && (
                                    <button onClick={() => onImageDelete('banner')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 size={12} /> Remover
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isNew && (
                <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                    Salve o perfil primeiro para adicionar logotipo e banner.
                </p>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 disabled:opacity-50"
                >
                    {saving ? 'Salvando...' : isNew ? 'Criar perfil' : 'Salvar alterações'}
                </button>
                {!isNew && selectedId && (
                    <>
                        <button
                            onClick={onUseProfile}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                        >
                            Usar este perfil
                        </button>
                        <button
                            onClick={onDelete}
                            className="ml-auto px-3 py-2 text-red-600 text-sm hover:bg-red-50 rounded-lg flex items-center gap-1.5"
                        >
                            <Trash2 size={14} />
                            Deletar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
