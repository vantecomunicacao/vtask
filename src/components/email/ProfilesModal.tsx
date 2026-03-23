import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { callEmailApi } from '../../lib/emailApi';
import type { EmailProfile, EmailSchedule, MailchimpList } from '../../lib/emailTypes';

interface ProfilesModalProps {
    onClose: () => void;
    onSelectProfile: (profile: EmailProfile) => void;
}

export type ProfileFormData = {
    name: string;
    mailchimp_api_key?: string;
    mailchimp_server?: string;
    mailchimp_list_id?: string;
    ai_prompt?: string;
    brand_color?: string;
    logo_url?: string;
    banner_url?: string;
    default_button_text?: string;
    default_button_link?: string;
    test_email?: string;
    themes_list?: string;
    openai_api_key?: string;
    cta_enabled?: boolean;
    email_length?: 'short' | 'medium' | 'long';
    button_color?: string;
    sender_name?: string;
    sender_email?: string;
};

export type ScheduleFormData = {
    name: string;
    cron_expression: string;
    template_id: string;
    prompt_override?: string;
    bg_color?: string;
    button_color?: string;
    button_text?: string;
    button_link?: string;
    active: boolean;
    is_dynamic_theme: boolean;
};

const emptyProfile = (): ProfileFormData => ({
    name: '',
    mailchimp_api_key: '',
    mailchimp_server: 'us5',
    mailchimp_list_id: '',
    ai_prompt: '',
    brand_color: '#db4035',
    logo_url: '',
    banner_url: '',
    default_button_text: '',
    default_button_link: '',
    test_email: '',
    themes_list: '',
    openai_api_key: '',
    cta_enabled: true,
    email_length: 'medium',
    button_color: '#db4035',
    sender_name: '',
    sender_email: '',
});

const emptySchedule = (): ScheduleFormData => ({
    name: '',
    cron_expression: '0 9 * * 1',
    template_id: 'newsletter',
    prompt_override: '',
    bg_color: '#f4f4f4',
    button_color: '#db4035',
    button_text: '',
    button_link: '',
    active: true,
    is_dynamic_theme: false,
});

export function ProfilesModal({ onClose, onSelectProfile }: ProfilesModalProps) {
    const [profiles, setProfiles] = useState<EmailProfile[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<ProfileFormData>(emptyProfile());
    const [loadingLists, setLoadingLists] = useState(false);
    const [, setLists] = useState<MailchimpList[]>([]);
    const [, setSchedules] = useState<EmailSchedule[]>([]);
    const isNew = selectedId === null;
    const [suggestingThemes, setSuggestingThemes] = useState(false);

    useEffect(() => { loadProfiles(); }, []);
    useEffect(() => {
        if (selectedId) loadSchedules(selectedId);
        else setSchedules([]);
    }, [selectedId]);

    async function loadProfiles() {
        const { data } = await supabase.from('email_profiles').select('*').order('name');
        if (data) setProfiles(data as EmailProfile[]);
    }

    async function loadSchedules(profileId: string) {
        const { data } = await supabase.from('email_schedules').select('*').eq('profile_id', profileId).order('name');
        if (data) setSchedules(data as EmailSchedule[]);
    }

    async function handleSaveProfile() {
        if (!form.name) { toast.error('Nome é obrigatório'); return; }
        const dataToSave = { ...form };
        if (selectedId && !isNew) {
            const { error } = await supabase.from('email_profiles').update(dataToSave).eq('id', selectedId);
            if (error) toast.error(error.message);
            else toast.success('Perfil atualizado');
        } else {
            const { data, error } = await supabase.from('email_profiles').insert(dataToSave).select().single();
            if (error) toast.error(error.message);
            else { toast.success('Perfil criado'); setSelectedId(data.id); }
        }
        loadProfiles();
    }

    async function handleLoadLists() {
        if (!form.mailchimp_api_key || !form.mailchimp_server) {
            toast.error('Preencha a API Key e o prefixo do servidor');
            return;
        }
        setLoadingLists(true);
        try {
            const data = await callEmailApi('/api/client-mailchimp-lists', { 
                apiKey: form.mailchimp_api_key, 
                server: form.mailchimp_server 
            });
            setLists(data.lists ?? []);
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoadingLists(false);
        }
    }

    async function handleSuggestThemes() {
        setSuggestingThemes(true);
        try {
            const data = await callEmailApi('/api/suggest-themes', { 
                clientContext: form.ai_prompt 
            });
            const newSuggestions = data.suggestions || '';
            setForm((f: any) => ({
                ...f,
                themes_list: f.themes_list ? `${f.themes_list}\n\n[Novas Sugestões]\n${newSuggestions}` : newSuggestions
            }));
            toast.success('Sugestões geradas!');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSuggestingThemes(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-surface-card w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-border-subtle">
                <div className="h-16 px-6 border-b border-border-subtle flex items-center justify-between bg-surface-card/80 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-xl font-black text-primary tracking-tight">GERENCIAR CLIENTES</h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r border-border-subtle flex flex-col bg-surface-1/30">
                        <div className="p-4 flex gap-2">
                            <button onClick={() => { setSelectedId(null); setForm(emptyProfile()); }} className="flex-1 h-11 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                                <Plus className="w-5 h-5" /> NOVO CLIENTE
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
                            {profiles.map(p => (
                                <button key={p.id} onClick={() => { setSelectedId(p.id); setForm(p as any); }} className={`w-full p-4 rounded-2xl text-left border transition-all ${selectedId === p.id ? 'bg-white border-brand shadow-md scale-[1.02]' : 'bg-white/50 border-transparent hover:border-border-subtle'}`}>
                                    <div className="font-bold text-primary truncate">{p.name}</div>
                                    <div className="text-xs text-text-tertiary mt-1">ID: {p.id.substring(0, 8)}...</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                        {isNew || selectedId ? (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-text-tertiary tracking-widest uppercase">Identificação</h3>
                                        <div className="flex gap-2">
                                            {selectedId && !isNew && (
                                                <button onClick={() => onSelectProfile(profiles.find(p => p.id === selectedId)!)} className="px-4 h-9 bg-surface-2 text-primary rounded-lg text-xs font-black border border-border-subtle hover:bg-surface-3 transition-all">SELECIONAR</button>
                                            )}
                                            <button onClick={handleSaveProfile} className="px-6 h-9 bg-brand text-white rounded-lg text-xs font-black shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all">SALVAR ALTERAÇÕES</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Nome do Cliente</label>
                                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all font-medium text-sm" placeholder="Ex: Vante Comunicação" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Remetente (Nome)</label>
                                                <input value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm" placeholder="Ex: João da Vante" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Remetente (E-mail)</label>
                                                <input value={form.sender_email} onChange={e => setForm({ ...form, sender_email: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm" placeholder="Ex: contato@vante.com" />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="pt-8 border-t border-border-subtle">
                                    <h3 className="text-sm font-black text-text-tertiary tracking-widest uppercase mb-4">Inteligência Artificial</h3>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Prompt de Contexto do Cliente</label>
                                                <button onClick={handleSuggestThemes} disabled={suggestingThemes} className="text-[10px] font-black text-brand italic hover:underline disabled:opacity-50">✨ Sugerir Temas</button>
                                            </div>
                                            <textarea value={form.ai_prompt} onChange={e => setForm({ ...form, ai_prompt: e.target.value })} className="w-full h-32 p-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm resize-none" placeholder="Descreva o tom de voz, público-alvo e regras de escrita..." />
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-1.5">
                                                <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">OpenAI API Key (Opcional)</label>
                                                <input type="password" value={form.openai_api_key} onChange={e => setForm({ ...form, openai_api_key: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm" placeholder="sk-..." />
                                            </div>
                                            <div className="w-1/3 space-y-1.5">
                                                <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Tamanho Padrão</label>
                                                <select value={form.email_length} onChange={e => setForm({ ...form, email_length: e.target.value as any })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm">
                                                    <option value="short">Curto</option>
                                                    <option value="medium">Médio</option>
                                                    <option value="long">Longo</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="pt-8 border-t border-border-subtle">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black text-text-tertiary tracking-widest uppercase">Integração Mailchimp</h3>
                                        <button onClick={handleLoadLists} disabled={loadingLists} className="px-4 h-8 bg-surface-2 text-primary rounded-lg text-[10px] font-black hover:bg-surface-3 transition-all disabled:opacity-50">BUSCAR LISTAS</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">API Key</label>
                                            <input type="password" value={form.mailchimp_api_key} onChange={e => setForm({ ...form, mailchimp_api_key: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm" placeholder="Ex: 827..." />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-text-tertiary ml-1 uppercase">Servidor (ex: us5)</label>
                                            <input value={form.mailchimp_server} onChange={e => setForm({ ...form, mailchimp_server: e.target.value })} className="w-full h-12 px-4 rounded-xl border border-border-subtle bg-surface-1 outline-none text-sm" placeholder="Ex: us1, us5" />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                                <div className="w-20 h-20 bg-surface-1 rounded-3xl flex items-center justify-center">
                                    <Plus className="w-10 h-10 text-text-tertiary italic" />
                                </div>
                                <h4 className="text-lg font-black text-primary uppercase">Selecione ou Crie</h4>
                                <p className="text-sm text-text-tertiary max-w-[280px] mx-auto">Escolha um cliente ao lado ou crie um novo perfil do zero.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
