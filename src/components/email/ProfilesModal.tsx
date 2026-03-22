import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { EmailProfile, EmailSchedule, ProfileFormData, ScheduleFormData, MailchimpList } from './emailTypes';
import { CRON_PRESETS } from './emailTypes';
import { ProfileForm } from './ProfileForm';
import { ProfileScheduleList } from './ProfileScheduleList';
import { ProfileScheduleForm } from './ProfileScheduleForm';

const SERVER_BASE = 'http://localhost:3001';
const SERVER_KEY = import.meta.env.VITE_SERVER_API_KEY || '';
const authHeader = SERVER_KEY ? { Authorization: `Bearer ${SERVER_KEY}` } : {};

interface ProfilesModalProps {
    onClose: () => void;
    onSelectProfile: (profile: EmailProfile) => void;
}

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

function getNextRun(cronExpr: string): string {
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) return 'Inválido';
    const now = new Date();
    now.setSeconds(0, 0);
    const minute = parts[0] === '*' ? 0 : parseInt(parts[0]);
    const hour = parts[1] === '*' ? 0 : parseInt(parts[1]);
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toLocaleString('pt-BR');
}

export function ProfilesModal({ onClose, onSelectProfile }: ProfilesModalProps) {
    const [profiles, setProfiles] = useState<EmailProfile[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<ProfileFormData>(emptyProfile());
    const [showKey, setShowKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingLists, setLoadingLists] = useState(false);
    const [lists, setLists] = useState<MailchimpList[]>([]);
    const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(emptySchedule());
    const [cronPreset, setCronPreset] = useState('0 9 * * 1');
    const [customCron, setCustomCron] = useState('');
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [uploadingImage, setUploadingImage] = useState<'logo' | 'banner' | null>(null);
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

    function selectProfile(p: EmailProfile) {
        setSelectedId(p.id);
        setIsNew(false);
        setForm({
            name: p.name,
            mailchimp_api_key: p.mailchimp_api_key ?? '',
            mailchimp_server: p.mailchimp_server ?? 'us5',
            mailchimp_list_id: p.mailchimp_list_id ?? '',
            ai_prompt: p.ai_prompt ?? '',
            brand_color: p.brand_color ?? '#db4035',
            logo_url: p.logo_url ?? '',
            banner_url: p.banner_url ?? '',
            default_button_text: p.default_button_text ?? '',
            default_button_link: p.default_button_link ?? '',
            test_email: p.test_email ?? '',
            themes_list: p.themes_list ?? '',
            openai_api_key: p.openai_api_key ?? '',
            cta_enabled: p.cta_enabled ?? true,
            email_length: p.email_length ?? 'medium',
            button_color: p.button_color ?? '#db4035',
            sender_name: p.sender_name ?? '',
            sender_email: p.sender_email ?? '',
        });
        setLists([]);
        setShowScheduleForm(false);
    }

    function startNew() {
        setSelectedId(null);
        setIsNew(true);
        setForm(emptyProfile());
        setLists([]);
        setSchedules([]);
        setShowScheduleForm(false);
    }

    async function handleSave() {
        if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
        setSaving(true);
        try {
            if (isNew) {
                const { data: { user } } = await supabase.auth.getUser();
                const { data, error } = await supabase
                    .from('email_profiles')
                    .insert({ ...form, created_by: user!.id })
                    .select()
                    .single();
                if (error) throw error;
                setProfiles(prev => [...prev, data as EmailProfile].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedId(data.id);
                setIsNew(false);
                toast.success('Perfil criado');
            } else {
                const { error } = await supabase
                    .from('email_profiles')
                    .update({ ...form, updated_at: new Date().toISOString() })
                    .eq('id', selectedId!);
                if (error) throw error;
                setProfiles(prev => prev.map(p => p.id === selectedId ? { ...p, ...form } : p));
                toast.success('Perfil salvo');
            }
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!selectedId) return;
        if (!confirm('Deletar este perfil e todos os agendamentos?')) return;
        const { error } = await supabase.from('email_profiles').delete().eq('id', selectedId);
        if (error) { toast.error(error.message); return; }
        setProfiles(prev => prev.filter(p => p.id !== selectedId));
        setSelectedId(null);
        setIsNew(false);
        toast.success('Perfil deletado');
    }

    async function handleLoadLists() {
        if (!form.mailchimp_api_key || !form.mailchimp_server) {
            toast.error('Preencha a API Key e o prefixo do servidor');
            return;
        }
        setLoadingLists(true);
        try {
            const res = await fetch(`${SERVER_BASE}/api/client-mailchimp-lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ apiKey: form.mailchimp_api_key, server: form.mailchimp_server }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLists(data.lists ?? []);
            if (data.lists?.length === 0) toast('Nenhuma lista encontrada');
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setLoadingLists(false);
        }
    }

    async function handleSuggestThemes() {
        setSuggestingThemes(true);
        try {
            const res = await fetch(`${SERVER_BASE}/api/suggest-themes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ clientContext: form.ai_prompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const newSuggestions = data.suggestions || '';
            setForm(f => ({
                ...f,
                themes_list: f.themes_list ? `${f.themes_list}\n\n[Novas Sugestões]\n${newSuggestions}` : newSuggestions
            }));
            toast.success('Novos temas sugeridos pela IA!');
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setSuggestingThemes(false);
        }
    }

    async function handleAddSchedule() {
        if (!selectedId) return;
        if (!scheduleForm.name.trim()) { toast.error('Nome do agendamento é obrigatório'); return; }
        const cronExpr = cronPreset === '__custom__' ? customCron : cronPreset;
        if (!cronExpr.trim()) { toast.error('Expressão cron inválida'); return; }

        const payload = {
            ...scheduleForm,
            cron_expression: cronExpr,
            profile_id: selectedId,
            next_run_at: new Date(getNextRun(cronExpr)).toISOString(),
        };

        if (editingScheduleId) {
            const { data, error } = await supabase
                .from('email_schedules')
                .update(payload)
                .eq('id', editingScheduleId)
                .select()
                .single();
            if (error) { toast.error(error.message); return; }
            setSchedules(prev => prev.map(s => s.id === editingScheduleId ? (data as EmailSchedule) : s));
            toast.success('Agendamento atualizado');
        } else {
            const { data, error } = await supabase
                .from('email_schedules')
                .insert(payload)
                .select()
                .single();
            if (error) { toast.error(error.message); return; }
            setSchedules(prev => [...prev, data as EmailSchedule]);
            toast.success('Agendamento criado');
        }

        setScheduleForm(emptySchedule());
        setCronPreset('0 9 * * 1');
        setCustomCron('');
        setEditingScheduleId(null);
        setShowScheduleForm(false);
    }

    async function handleToggleSchedule(s: EmailSchedule) {
        const { error } = await supabase.from('email_schedules').update({ active: !s.active }).eq('id', s.id);
        if (error) { toast.error(error.message); return; }
        setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x));
    }

    async function handleDeleteSchedule(id: string) {
        if (!confirm('Deletar este agendamento?')) return;
        const { error } = await supabase.from('email_schedules').delete().eq('id', id);
        if (error) { toast.error(error.message); return; }
        setSchedules(prev => prev.filter(x => x.id !== id));
        toast.success('Agendamento removido');
    }

    async function handleProfileImageUpload(type: 'logo' | 'banner', file: File) {
        if (!selectedId) return;
        setUploadingImage(type);
        try {
            const ext = file.name.split('.').pop();
            const path = `profiles/${selectedId}/${type}.${ext}`;
            const { error: upErr } = await supabase.storage.from('email_images').upload(path, file, { upsert: true, contentType: file.type });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('email_images').getPublicUrl(path);
            const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
            const field = type === 'logo' ? 'logo_url' : 'banner_url';
            const { error: dbErr } = await supabase.from('email_profiles').update({ [field]: publicUrl }).eq('id', selectedId);
            if (dbErr) throw dbErr;
            setForm(f => ({ ...f, [field]: publicUrl }));
            setProfiles(prev => prev.map(p => p.id === selectedId ? { ...p, [field]: publicUrl } : p));
            toast.success(type === 'logo' ? 'Logotipo atualizado!' : 'Banner atualizado!');
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setUploadingImage(null);
        }
    }

    async function handleProfileImageDelete(type: 'logo' | 'banner') {
        if (!selectedId) return;
        const field = type === 'logo' ? 'logo_url' : 'banner_url';
        const currentUrl = type === 'logo' ? form.logo_url : form.banner_url;
        if (!currentUrl) return;
        try {
            const storagePath = currentUrl.split('/email_images/')[1];
            if (storagePath) await supabase.storage.from('email_images').remove([storagePath]);
            await supabase.from('email_profiles').update({ [field]: null }).eq('id', selectedId);
            setForm(f => ({ ...f, [field]: '' }));
            setProfiles(prev => prev.map(p => p.id === selectedId ? { ...p, [field]: null } : p));
            toast.success(type === 'logo' ? 'Logotipo removido.' : 'Banner removido.');
        } catch (err: unknown) {
            toast.error((err as Error).message);
        }
    }

    function handleUseProfile() {
        const profile = profiles.find(p => p.id === selectedId);
        if (profile) { onSelectProfile(profile); onClose(); }
    }

    function handleEditSchedule(s: EmailSchedule) {
        setScheduleForm(s);
        setCronPreset(CRON_PRESETS.some(p => p.value === s.cron_expression) ? s.cron_expression : '__custom__');
        setCustomCron(CRON_PRESETS.some(p => p.value === s.cron_expression) ? '' : s.cron_expression);
        setEditingScheduleId(s.id);
        setShowScheduleForm(true);
    }

    const showForm = isNew || selectedId !== null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-900 text-lg">Perfis de Cliente</h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left sidebar */}
                    <div className="w-56 border-r border-gray-200 flex flex-col">
                        <div className="p-3 border-b border-gray-100">
                            <button
                                onClick={startNew}
                                className="w-full flex items-center gap-2 text-sm font-medium text-brand hover:text-brand px-2 py-1.5 rounded hover:bg-brand-light"
                            >
                                <Plus size={15} />
                                Novo perfil
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            {profiles.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => selectProfile(p)}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedId === p.id && !isNew ? 'bg-brand-light text-brand font-medium' : 'text-gray-700'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.brand_color }} />
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                </button>
                            ))}
                            {profiles.length === 0 && (
                                <p className="text-xs text-gray-400 px-4 py-3">Nenhum perfil</p>
                            )}
                        </div>
                    </div>

                    {/* Right — form */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!showForm ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                                Selecione ou crie um perfil
                            </div>
                        ) : (
                            <>
                                <ProfileForm
                                    form={form}
                                    onFormChange={setForm}
                                    isNew={isNew}
                                    selectedId={selectedId}
                                    showKey={showKey}
                                    onToggleShowKey={() => setShowKey(v => !v)}
                                    lists={lists}
                                    loadingLists={loadingLists}
                                    onLoadLists={handleLoadLists}
                                    suggestingThemes={suggestingThemes}
                                    onSuggestThemes={handleSuggestThemes}
                                    uploadingImage={uploadingImage}
                                    onImageUpload={handleProfileImageUpload}
                                    onImageDelete={handleProfileImageDelete}
                                    saving={saving}
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    onUseProfile={handleUseProfile}
                                />

                                {/* Schedules section */}
                                {!isNew && selectedId && (
                                    <div className="border-t border-gray-200 pt-5 mt-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-gray-700">Agendamentos</h3>
                                            <button
                                                onClick={() => {
                                                    setShowScheduleForm(v => !v);
                                                    if (!showScheduleForm) {
                                                        setScheduleForm(emptySchedule());
                                                        setCronPreset('0 9 * * 1');
                                                        setCustomCron('');
                                                        setEditingScheduleId(null);
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-brand hover:text-brand font-medium"
                                            >
                                                <Plus size={13} />
                                                Novo agendamento
                                            </button>
                                        </div>

                                        <ProfileScheduleList
                                            schedules={schedules}
                                            expandedSchedule={expandedSchedule}
                                            onToggleExpand={id => setExpandedSchedule(expandedSchedule === id ? null : id)}
                                            onToggle={handleToggleSchedule}
                                            onEdit={handleEditSchedule}
                                            onDelete={handleDeleteSchedule}
                                        />

                                        {showScheduleForm && (
                                            <ProfileScheduleForm
                                                editingScheduleId={editingScheduleId}
                                                scheduleForm={scheduleForm}
                                                onScheduleFormChange={setScheduleForm}
                                                cronPreset={cronPreset}
                                                onCronPresetChange={setCronPreset}
                                                customCron={customCron}
                                                onCustomCronChange={setCustomCron}
                                                onSubmit={handleAddSchedule}
                                                onCancel={() => { setShowScheduleForm(false); setEditingScheduleId(null); }}
                                            />
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
