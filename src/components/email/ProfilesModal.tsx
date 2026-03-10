import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, RefreshCw, ChevronDown, ChevronRight, Play, Pause, Upload, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// ---- Types ----
interface EmailProfile {
  id: string;
  name: string;
  mailchimp_api_key: string | null;
  mailchimp_server: string | null;
  mailchimp_list_id: string | null;
  ai_prompt: string | null;
  brand_color: string;
  logo_url: string | null;
  banner_url: string | null;
  default_button_text: string | null;
  default_button_link: string | null;
  test_email: string | null;
  themes_list: string | null;
}

interface EmailSchedule {
  id: string;
  profile_id: string;
  name: string;
  cron_expression: string;
  template_id: string;
  prompt_override: string | null;
  bg_color: string;
  button_color: string;
  button_text: string | null;
  button_link: string | null;
  active: boolean;
  is_dynamic_theme: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface MailchimpList {
  id: string;
  name: string;
  count: number;
}

interface ProfilesModalProps {
  onClose: () => void;
  onSelectProfile: (profile: EmailProfile) => void;
}

// ---- Helpers ----
const TEMPLATES = [
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'comunicado', label: 'Comunicado' },
  { id: 'promocao', label: 'Promoção' },
  { id: 'alerta', label: 'Alerta' },
  { id: 'boas-vindas', label: 'Boas-vindas' },
];

const CRON_PRESETS = [
  { label: 'Todo dia às 9h', value: '0 9 * * *' },
  { label: 'Toda segunda às 9h', value: '0 9 * * 1' },
  { label: 'Toda terça às 9h', value: '0 9 * * 2' },
  { label: 'Toda quarta às 9h', value: '0 9 * * 3' },
  { label: 'Toda quinta às 9h', value: '0 9 * * 4' },
  { label: 'Toda sexta às 9h', value: '0 9 * * 5' },
  { label: 'Quinzenalmente às 9h', value: '0 9 1,15 * *' },
  { label: 'Personalizado', value: '__custom__' },
];

function describeCron(expr: string): string {
  const presets: Record<string, string> = {
    '0 9 * * *': 'Diariamente às 9h',
    '0 9 * * 1': 'Toda segunda às 9h',
    '0 9 * * 2': 'Toda terça às 9h',
    '0 9 * * 3': 'Toda quarta às 9h',
    '0 9 * * 4': 'Toda quinta às 9h',
    '0 9 * * 5': 'Toda sexta às 9h',
    '0 9 1,15 * *': 'Quinzenalmente às 9h',
    '0 9 1 * *': 'Todo dia 1º às 9h',
  };
  return presets[expr] ?? `Cron: ${expr}`;
}

function getNextRun(cronExpr: string): string {
  // Simple approximation – real calc done server-side
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

// ---- Empty forms ----
const emptyProfile = (): Omit<EmailProfile, 'id'> => ({
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
});

const emptySchedule = (): Omit<EmailSchedule, 'id' | 'profile_id' | 'last_run_at' | 'next_run_at'> => ({
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

// =====================
// Main component
// =====================
export function ProfilesModal({ onClose, onSelectProfile }: ProfilesModalProps) {
  const [profiles, setProfiles] = useState<EmailProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProfile());
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [lists, setLists] = useState<MailchimpList[]>([]);
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule());
  const [cronPreset, setCronPreset] = useState('0 9 * * 1');
  const [customCron, setCustomCron] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<'logo' | 'banner' | null>(null);
  const [suggestingThemes, setSuggestingThemes] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedId) loadSchedules(selectedId);
    else setSchedules([]);
  }, [selectedId]);

  async function loadProfiles() {
    const { data } = await supabase.from('email_profiles').select('*').order('name');
    if (data) setProfiles(data as EmailProfile[]);
  }

  async function loadSchedules(profileId: string) {
    const { data } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('profile_id', profileId)
      .order('name');
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
      const res = await fetch('http://localhost:3001/api/client-mailchimp-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('http://localhost:3001/api/suggest-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // Editar
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
      // Criar Novo
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
    const { error } = await supabase
      .from('email_schedules')
      .update({ active: !s.active })
      .eq('id', s.id);
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
      const { error: upErr } = await supabase.storage
        .from('email_images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('email_images').getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      const field = type === 'logo' ? 'logo_url' : 'banner_url';
      const { error: dbErr } = await supabase
        .from('email_profiles')
        .update({ [field]: publicUrl })
        .eq('id', selectedId);
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
      // Extract storage path from public URL
      const storagePath = currentUrl.split('/email_images/')[1];
      if (storagePath) {
        await supabase.storage.from('email_images').remove([storagePath]);
      }
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
    if (profile) {
      onSelectProfile(profile);
      onClose();
    }
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
          {/* Left sidebar — profile list */}
          <div className="w-56 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-100">
              <button
                onClick={startNew}
                className="w-full flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-2 py-1.5 rounded hover:bg-blue-50"
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
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${selectedId === p.id && !isNew ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.brand_color }}
                    />
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
              <div className="space-y-5">
                {/* Profile form */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome do perfil *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Acme Corp, Cliente X..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mailchimp API Key</label>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={form.mailchimp_api_key ?? ''}
                        onChange={e => setForm(f => ({ ...f, mailchimp_api_key: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="xxxx-us5"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(v => !v)}
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
                      onChange={e => setForm(f => ({ ...f, mailchimp_server: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="us5"
                    />
                  </div>

                  {/* List picker */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lista Mailchimp</label>
                    <div className="flex gap-2">
                      <select
                        value={form.mailchimp_list_id ?? ''}
                        onChange={e => setForm(f => ({ ...f, mailchimp_list_id: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecionar lista...</option>
                        {lists.map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.count.toLocaleString()})</option>
                        ))}
                      </select>
                      <button
                        onClick={handleLoadLists}
                        disabled={loadingLists}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw size={13} className={loadingLists ? 'animate-spin' : ''} />
                        Carregar
                      </button>
                    </div>
                  </div>

                  {/* AI Prompt */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Instruções da Empresa (Nome, E-mail, Info Geral)</label>
                    <textarea
                      value={form.ai_prompt ?? ''}
                      onChange={e => setForm(f => ({ ...f, ai_prompt: e.target.value }))}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Ex: Nome: Vflow, E-mail: contato@vflow.com. Somos uma empresa de tecnologia focada em automação..."
                    />
                  </div>

                  {/* CTA e Teste */}
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Texto do Botão Padrão</label>
                    <input
                      type="text"
                      value={form.default_button_text ?? ''}
                      onChange={e => setForm(f => ({ ...f, default_button_text: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Saiba Mais"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link do Botão Padrão</label>
                    <input
                      type="url"
                      value={form.default_button_link ?? ''}
                      onChange={e => setForm(f => ({ ...f, default_button_link: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mail para Receber Testes Agendados</label>
                    <input
                      type="email"
                      value={form.test_email ?? ''}
                      onChange={e => setForm(f => ({ ...f, test_email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="seu@email.com"
                    />
                  </div>

                  {/* Lista de Temas */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-gray-600">Lista de Temas (Inspirações/Sugestões)</label>
                      <button
                        onClick={handleSuggestThemes}
                        disabled={suggestingThemes}
                        className="text-xs text-brand hover:text-brand/80 font-medium disabled:opacity-50"
                      >
                        {suggestingThemes ? 'Sugerindo...' : '✨ Sugerir Temas com IA'}
                      </button>
                    </div>
                    <textarea
                      value={form.themes_list ?? ''}
                      onChange={e => setForm(f => ({ ...f, themes_list: e.target.value }))}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y custom-scrollbar"
                      placeholder="Anote aqui ideias de temas para os próximos e-mails..."
                    />
                  </div>


                  {/* Visual settings */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cor principal</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.brand_color}
                        onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={form.brand_color}
                        onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                </div>

                {/* Image management — only when editing existing profile */}
                {!isNew && selectedId && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-600">Imagens do Perfil</p>
                    </div>
                    <div className="p-4 space-y-4">

                      {/* Logo slot */}
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
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleProfileImageUpload('logo', f); e.target.value = ''; }} />
                            </label>
                            {form.logo_url && (
                              <button onClick={() => handleProfileImageDelete('logo')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 size={12} /> Remover
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Banner slot */}
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
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleProfileImageUpload('banner', f); e.target.value = ''; }} />
                          </label>
                          {form.banner_url && (
                            <button onClick={() => handleProfileImageDelete('banner')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={12} /> Remover
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Note for new profiles */}
                {isNew && (
                  <p className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                    Salve o perfil primeiro para adicionar logotipo e banner.
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : isNew ? 'Criar perfil' : 'Salvar alterações'}
                  </button>
                  {!isNew && selectedId && (
                    <>
                      <button
                        onClick={handleUseProfile}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                      >
                        Usar este perfil
                      </button>
                      <button
                        onClick={handleDelete}
                        className="ml-auto px-3 py-2 text-red-600 text-sm hover:bg-red-50 rounded-lg flex items-center gap-1.5"
                      >
                        <Trash2 size={14} />
                        Deletar
                      </button>
                    </>
                  )}
                </div>

                {/* Schedules section — only when editing existing */}
                {!isNew && selectedId && (
                  <div className="border-t border-gray-200 pt-5">
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
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Plus size={13} />
                        Novo agendamento
                      </button>
                    </div>

                    {/* Existing schedules */}
                    <div className="space-y-2">
                      {schedules.map(s => (
                        <div key={s.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50">
                            <button
                              onClick={() => setExpandedSchedule(expandedSchedule === s.id ? null : s.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {expandedSchedule === s.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <span className="flex-1 text-sm font-medium text-gray-800 truncate">{s.name}</span>
                            <span className="text-xs text-gray-500">{describeCron(s.cron_expression)}</span>
                            <button
                              onClick={() => handleToggleSchedule(s)}
                              className={`p-1 rounded ${s.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={s.active ? 'Pausar' : 'Ativar'}
                            >
                              {s.active ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                              onClick={() => {
                                setScheduleForm(s);
                                setCronPreset(CRON_PRESETS.some(p => p.value === s.cron_expression) ? s.cron_expression : '__custom__');
                                setCustomCron(CRON_PRESETS.some(p => p.value === s.cron_expression) ? '' : s.cron_expression);
                                setEditingScheduleId(s.id);
                                setShowScheduleForm(true);
                              }}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50"
                              title="Editar"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.id)}
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
                      {schedules.length === 0 && (
                        <p className="text-xs text-gray-400 py-2">Nenhum agendamento configurado</p>
                      )}
                    </div>

                    {/* New/Edit schedule form */}
                    {showScheduleForm && (
                      <div className="mt-3 p-4 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
                        <h4 className="text-xs font-semibold text-blue-800">
                          {editingScheduleId ? 'Editar agendamento' : 'Novo agendamento'}
                        </h4>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
                          <input
                            type="text"
                            value={scheduleForm.name}
                            onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: Newsletter semanal"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
                          <select
                            value={cronPreset}
                            onChange={e => setCronPreset(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CRON_PRESETS.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                          {cronPreset === '__custom__' && (
                            <input
                              type="text"
                              value={customCron}
                              onChange={e => setCustomCron(e.target.value)}
                              className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0 9 * * 1"
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
                            <select
                              value={scheduleForm.template_id}
                              onChange={e => setScheduleForm(f => ({ ...f, template_id: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            >
                              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Cor do botão</label>
                            <input
                              type="color"
                              value={scheduleForm.button_color}
                              onChange={e => setScheduleForm(f => ({ ...f, button_color: e.target.value }))}
                              className="w-full h-9 rounded border border-gray-200 cursor-pointer"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={scheduleForm.is_dynamic_theme}
                            onChange={e => setScheduleForm(f => ({ ...f, is_dynamic_theme: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
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
                              onChange={e => setScheduleForm(f => ({ ...f, prompt_override: e.target.value }))}
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
                              onChange={e => setScheduleForm(f => ({ ...f, button_text: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              placeholder="Saiba mais"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Link do botão</label>
                            <input
                              type="text"
                              value={scheduleForm.button_link ?? ''}
                              onChange={e => setScheduleForm(f => ({ ...f, button_link: e.target.value }))}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleAddSchedule}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                          >
                            {editingScheduleId ? 'Salvar Edição' : 'Criar agendamento'}
                          </button>
                          <button
                            onClick={() => {
                              setShowScheduleForm(false);
                              setEditingScheduleId(null);
                            }}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
