import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { toast } from 'sonner';
import { ProfilesModal } from '../components/email/ProfilesModal';

type EmailDraft = {
    id: string;
    name: string;
    template_id: string;
    title: string | null;
    prompt: string | null;
    logo_url: string | null;
    banner_url: string | null;
    bottom_image_url: string | null;
    button_text: string | null;
    button_link: string | null;
    bg_color: string | null;
    button_color: string | null;
    generated_html: string | null;
    generated_subject: string | null;
    created_at: string;
};

type MailchimpList = { id: string; name: string; count: number };
type SectionKey = 'perfil' | 'envio' | 'rascunhos' | 'design' | 'ia';

type EmailProfile = {
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
};

const TEMPLATES = [
    { id: 'newsletter', label: 'Newsletter', desc: 'Cabeçalho colorido', color: '' },
    { id: 'comunicado', label: 'Comunicado', desc: 'Borda superior', color: '#2563eb' },
    { id: 'promocao', label: 'Promoção', desc: 'Header escuro', color: '#111827' },
    { id: 'alerta', label: 'Alerta', desc: 'Banner vermelho', color: '#ef4444' },
    { id: 'boas-vindas', label: 'Boas-Vindas', desc: 'Onboarding', color: '#22c55e' },
];

function SectionHeader({
    title, sectionKey, openSections, toggle, badge,
}: {
    title: string;
    sectionKey: SectionKey;
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    badge?: number;
}) {
    return (
        <button
            onClick={() => toggle(sectionKey)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
        >
            <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                {title}
                {badge !== undefined && badge > 0 && (
                    <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full leading-none">{badge}</span>
                )}
            </span>
            <span className="text-gray-400 text-[10px]">{openSections[sectionKey] ? '▲' : '▼'}</span>
        </button>
    );
}

export default function GeradorEmail() {
    const { activeWorkspace } = useWorkspaceStore();
    const workspaceId = activeWorkspace?.id;

    // Email identity
    const [emailName, setEmailName] = useState('Sem título');
    const [isEditingName, setIsEditingName] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Envio
    const [subject, setSubject] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [selectedListId, setSelectedListId] = useState('');
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [mailchimpLists, setMailchimpLists] = useState<MailchimpList[]>([]);

    // Design
    const [internalTemplateId, setInternalTemplateId] = useState('newsletter');
    const [title, setTitle] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [bottomImageUrl, setBottomImageUrl] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [buttonLink, setButtonLink] = useState('');
    const [bgColor, setBgColor] = useState('#f4f4f4');
    const [buttonColor, setButtonColor] = useState('#db4035');

    // IA
    const [prompt, setPrompt] = useState('');

    // UI
    const [loading, setLoading] = useState(false);
    const [suggestingSubject, setSuggestingSubject] = useState(false);
    const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
    const [status, setStatus] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [mobilePreview, setMobilePreview] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
        perfil: true, envio: true, rascunhos: false, design: false, ia: true,
    });
    const [savingDraft, setSavingDraft] = useState(false);
    const [drafts, setDrafts] = useState<EmailDraft[]>([]);

    // Profiles
    const [selectedProfile, setSelectedProfile] = useState<EmailProfile | null>(null);
    const [showProfilesModal, setShowProfilesModal] = useState(false);

    // Apply profile settings when selected
    useEffect(() => {
        if (!selectedProfile) return;
        if (selectedProfile.brand_color) setButtonColor(selectedProfile.brand_color);
        if (selectedProfile.logo_url) setLogoUrl(selectedProfile.logo_url);
        if (selectedProfile.banner_url) setBannerUrl(selectedProfile.banner_url);
        if (selectedProfile.ai_prompt && !prompt) setPrompt(selectedProfile.ai_prompt);
        if (selectedProfile.default_button_text) setButtonText(selectedProfile.default_button_text);
        if (selectedProfile.default_button_link) setButtonLink(selectedProfile.default_button_link);
        // Load this client's Mailchimp lists
        if (selectedProfile.mailchimp_api_key && selectedProfile.mailchimp_server) {
            fetch('http://localhost:3001/api/client-mailchimp-lists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: selectedProfile.mailchimp_api_key,
                    server: selectedProfile.mailchimp_server,
                }),
            })
                .then(r => r.json())
                .then(d => {
                    if (d.lists) {
                        setMailchimpLists(d.lists);
                        if (selectedProfile.mailchimp_list_id) setSelectedListId(selectedProfile.mailchimp_list_id);
                    }
                })
                .catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProfile]);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const toggleSection = (k: SectionKey) => setOpenSections(p => ({ ...p, [k]: !p[k] }));

    // Load drafts + cleanup on workspace change
    useEffect(() => {
        if (!workspaceId) return;
        loadDrafts();
        cleanupOldImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    // Fetch Mailchimp lists
    useEffect(() => {
        fetch('http://localhost:3001/api/mailchimp-lists')
            .then(r => r.json())
            .then(d => { if (d.lists) setMailchimpLists(d.lists); })
            .catch(() => { });
    }, []);

    // Focus name input when editing
    useEffect(() => {
        if (isEditingName) nameInputRef.current?.select();
    }, [isEditingName]);

    const loadDrafts = async () => {
        if (!workspaceId) return;
        const { data } = await supabase
            .from('email_drafts')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });
        if (data) setDrafts(data as EmailDraft[]);
    };

    const cleanupOldImages = async () => {
        if (!workspaceId) return;
        const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        const { data: oldImages } = await supabase
            .from('email_image_log')
            .select('id, path')
            .eq('workspace_id', workspaceId)
            .lt('uploaded_at', cutoff);
        if (!oldImages || oldImages.length === 0) return;
        const paths = oldImages.map((r: { path: string }) => r.path);
        await supabase.storage.from('email_images').remove(paths);
        const ids = oldImages.map((r: { id: string }) => r.id);
        await supabase.from('email_image_log').delete().in('id', ids);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner' | 'bottom') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setStatus(`Enviando ${target}...`);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `public/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('email_images').upload(filePath, file, { contentType: file.type });
            if (uploadError) {
                toast.error('Erro no upload. Verifique o bucket "email_images".');
                setStatus('Erro no upload.');
                return;
            }
            const { data } = supabase.storage.from('email_images').getPublicUrl(filePath);
            if (data.publicUrl) {
                if (target === 'logo') setLogoUrl(data.publicUrl);
                if (target === 'banner') setBannerUrl(data.publicUrl);
                if (target === 'bottom') setBottomImageUrl(data.publicUrl);
                setStatus('Imagem enviada!');
                toast.success('Imagem enviada com sucesso!');
                if (workspaceId) {
                    await supabase.from('email_image_log').insert({ path: filePath, workspace_id: workspaceId });
                }
            }
        } catch {
            toast.error('Erro na conexão com o Storage.');
            setStatus('Erro de conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        setIsEditing(false);
        setStatus('Gerando conteúdo com IA...');
        try {
            const res = await fetch('http://localhost:3001/api/generate-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt, logoUrl, bannerUrl, bottomImageUrl,
                    buttonText, buttonLink, title, bgColor, buttonColor,
                    internalTemplateId, previewText,
                    clientContext: selectedProfile?.ai_prompt
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult({ subject: data.subject, body: data.body });
            if (!subject) setSubject(data.subject);
            setStatus('Conteúdo gerado com sucesso!');
        } catch (error: unknown) {
            setStatus('Erro ao gerar.');
            toast.error(error instanceof Error ? error.message : 'Erro na geração');
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestSubject = async () => {
        if (!prompt && !title) return toast.error('Preencha o prompt ou o título primeiro.');
        setSuggestingSubject(true);
        try {
            const res = await fetch('http://localhost:3001/api/suggest-subject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, title, clientContext: selectedProfile?.ai_prompt }),
            });
            const data = await res.json();
            if (data.subject) setSubject(data.subject);
            if (data.preview && !previewText) setPreviewText(data.preview);
            toast.success('Sugestão aplicada!');
        } catch {
            toast.error('Erro ao sugerir. Verifique o servidor local.');
        }
        setSuggestingSubject(false);
    };

    const handleSaveDraft = async () => {
        if (!workspaceId) return toast.error('Nenhum workspace ativo.');
        const name = window.prompt('Nome do rascunho:');
        if (!name?.trim()) return;
        setSavingDraft(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('email_drafts').insert({
            workspace_id: workspaceId,
            created_by: user?.id,
            name: name.trim(),
            template_id: internalTemplateId,
            title, prompt,
            logo_url: logoUrl || null,
            banner_url: bannerUrl || null,
            bottom_image_url: bottomImageUrl || null,
            button_text: buttonText || null,
            button_link: buttonLink || null,
            bg_color: bgColor,
            button_color: buttonColor,
            generated_html: result?.body || null,
            generated_subject: subject || result?.subject || null,
        });
        if (error) {
            toast.error('Erro ao salvar rascunho.');
        } else {
            toast.success('Rascunho salvo!');
            loadDrafts();
        }
        setSavingDraft(false);
    };

    const handleLoadDraft = (draft: EmailDraft) => {
        setInternalTemplateId(draft.template_id);
        setTitle(draft.title || '');
        setPrompt(draft.prompt || '');
        setLogoUrl(draft.logo_url || '');
        setBannerUrl(draft.banner_url || '');
        setBottomImageUrl(draft.bottom_image_url || '');
        setButtonText(draft.button_text || '');
        setButtonLink(draft.button_link || '');
        setBgColor(draft.bg_color || '#f4f4f4');
        setButtonColor(draft.button_color || '#db4035');
        if (draft.generated_subject) setSubject(draft.generated_subject);
        if (draft.generated_html && draft.generated_subject) {
            setResult({ subject: draft.generated_subject, body: draft.generated_html });
        } else {
            setResult(null);
        }
        setOpenSections(p => ({ ...p, rascunhos: false }));
        toast.success(`Rascunho "${draft.name}" carregado.`);
    };

    const handleDeleteDraft = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await supabase.from('email_drafts').delete().eq('id', id);
        setDrafts(prev => prev.filter(d => d.id !== id));
        toast.success('Rascunho deletado.');
    };

    const injectImageEditor = (doc: Document) => {
        doc.getElementById('__img-toolbar__')?.remove();
        doc.getElementById('__img-editor-style__')?.remove();

        const style = doc.createElement('style');
        style.id = '__img-editor-style__';
        style.textContent = 'img { max-width: 100% !important; height: auto !important; box-sizing: border-box; }';
        doc.head.appendChild(style);

        const toolbar = doc.createElement('div');
        toolbar.id = '__img-toolbar__';
        toolbar.setAttribute('style', [
            'display:none', 'position:fixed', 'z-index:99999',
            'background:#1f2937', 'border-radius:8px', 'padding:5px 7px',
            'gap:4px', 'align-items:center', 'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
            'top:10px', 'left:50%', 'transform:translateX(-50%)',
        ].join(';'));

        const btns = [
            { label: '◀ Esq', action: 'left' },
            { label: '⬛ Centro', action: 'center' },
            { label: 'Dir ▶', action: 'right' },
            { label: '➕', action: 'bigger' },
            { label: '➖', action: 'smaller' },
            { label: '🗑️', action: 'delete', danger: true },
        ];
        btns.forEach(btn => {
            const b = doc.createElement('button');
            b.textContent = btn.label;
            b.dataset.action = btn.action;
            b.setAttribute('style', [
                `background:${btn.danger ? '#ef4444' : '#374151'}`,
                'color:#fff', 'border:none', 'padding:4px 9px',
                'border-radius:5px', 'cursor:pointer', 'font-size:11px',
                'font-family:sans-serif', 'white-space:nowrap',
            ].join(';'));
            toolbar.appendChild(b);
        });
        doc.body.appendChild(toolbar);

        let sel: HTMLImageElement | null = null;
        const showToolbar = (img: HTMLImageElement) => {
            if (sel) sel.style.outline = '';
            sel = img;
            sel.style.outline = '2px solid #3b82f6';
            toolbar.style.display = 'flex';
        };

        doc.addEventListener('click', (e) => {
            const t = e.target as HTMLElement;
            if (t.tagName === 'IMG') {
                showToolbar(t as HTMLImageElement);
            } else if (!toolbar.contains(t)) {
                if (sel) sel.style.outline = '';
                sel = null;
                toolbar.style.display = 'none';
            }
        });

        toolbar.addEventListener('mousedown', (e) => e.preventDefault());
        toolbar.addEventListener('click', (e) => {
            const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
            if (!btn || !sel) return;
            const img = sel;
            const action = btn.dataset.action;
            if (action === 'delete') {
                img.style.outline = '';
                toolbar.style.display = 'none';
                sel = null;
                img.remove();
                return;
            }
            if (action === 'center') {
                img.style.cssText += ';display:block;margin:0 auto;float:none';
                const td = img.closest('td');
                if (td) { td.setAttribute('align', 'center'); (td as HTMLElement).style.textAlign = 'center'; }
            }
            if (action === 'left') {
                img.style.cssText += ';display:block;margin:0 auto 0 0;float:none';
                const td = img.closest('td');
                if (td) { td.setAttribute('align', 'left'); (td as HTMLElement).style.textAlign = 'left'; }
            }
            if (action === 'right') {
                img.style.cssText += ';display:block;margin:0 0 0 auto;float:none';
                const td = img.closest('td');
                if (td) { td.setAttribute('align', 'right'); (td as HTMLElement).style.textAlign = 'right'; }
            }
            if (action === 'bigger' || action === 'smaller') {
                const cur = parseInt(img.getAttribute('width') || img.style.width || '150');
                const next = action === 'bigger' ? Math.min(cur + 50, 600) : Math.max(cur - 50, 50);
                img.setAttribute('width', String(next));
                img.style.width = `${next}px`;
            }
        });
    };

    const toggleEditMode = () => {
        if (!iframeRef.current?.contentDocument) return;
        const doc = iframeRef.current.contentDocument;
        if (!isEditing) {
            doc.designMode = 'on';
            injectImageEditor(doc);
            setIsEditing(true);
            setStatus('✏️ Clique no texto para editar, clique em imagens para ferramentas.');
        } else {
            doc.getElementById('__img-toolbar__')?.remove();
            doc.getElementById('__img-editor-style__')?.remove();
            doc.querySelectorAll('img').forEach(img => { (img as HTMLImageElement).style.outline = ''; });
            doc.designMode = 'off';
            setIsEditing(false);
            setStatus('Edições salvas.');
        }
    };

    const handleExport = () => {
        if (!result) return toast.error('Gere o conteúdo antes de exportar.');
        setShowChecklist(true);
    };

    const handleCreateCampaign = async () => {
        setShowChecklist(false);
        setLoading(true);
        setStatus('Enviando para o Mailchimp...');
        let finalHtml = result!.body;
        if (iframeRef.current?.contentDocument) {
            finalHtml = iframeRef.current.contentDocument.documentElement.outerHTML;
            iframeRef.current.contentDocument.designMode = 'off';
            setIsEditing(false);
        }
        try {
            const res = await fetch('http://localhost:3001/api/create-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject || result?.subject,
                    htmlContent: finalHtml,
                    listId: selectedListId || undefined,
                    previewText: previewText || undefined,
                    scheduleTime: scheduleEnabled && scheduledAt
                        ? new Date(scheduledAt).toISOString()
                        : undefined,
                    apiKey: selectedProfile?.mailchimp_api_key || undefined,
                    serverPrefix: selectedProfile?.mailchimp_server || undefined,
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setStatus(`✨ Campanha criada: ${data.campaignId}`);
            toast.success('Campanha enviada para o Mailchimp!');
        } catch (error: unknown) {
            setStatus('Erro na exportação.');
            toast.error(error instanceof Error ? error.message : 'Erro ao integrar com Mailchimp.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
        if (diff === 0) return 'hoje';
        if (diff === 1) return 'ontem';
        return `${diff}d atrás`;
    };

    const finalSubject = subject || result?.subject || '';
    const selectedList = mailchimpLists.find(l => l.id === selectedListId);
    const checks = [
        { label: 'Conteúdo gerado', ok: !!result, blocking: true },
        { label: finalSubject ? `Assunto: "${finalSubject.slice(0, 45)}${finalSubject.length > 45 ? '…' : ''}"` : 'Assunto vazio', ok: !!finalSubject, blocking: true },
        { label: selectedList ? `Público: ${selectedList.name} (${selectedList.count} contatos)` : 'Nenhum público selecionado', ok: !!selectedListId, blocking: false },
        { label: previewText ? 'Texto de prévia preenchido' : 'Sem texto de prévia (recomendado)', ok: !!previewText, blocking: false },
    ];
    const canSend = checks.filter(c => c.blocking).every(c => c.ok);
    const getTemplateHeaderColor = (id: string) => {
        if (id === 'newsletter') return buttonColor;
        return TEMPLATES.find(t => t.id === id)?.color || '#6b7280';
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">

            {/* ── Top Bar ── */}
            <div className="flex-shrink-0 h-14 bg-white border-b flex items-center px-5 gap-3">
                {/* Email name */}
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        value={emailName}
                        onChange={e => setEmailName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                        className="text-sm font-semibold bg-transparent border-b border-gray-300 outline-none w-44"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingName(true)}
                        title="Clique para renomear"
                        className="text-sm font-semibold text-gray-800 hover:text-gray-500 transition-colors max-w-44 truncate"
                    >
                        {emailName}
                    </button>
                )}

                {/* Status pill */}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
                    {result ? 'Pronto' : 'Rascunho'}
                </span>

                <div className="flex-1" />

                {/* Status message */}
                {status && (
                    <span className="text-xs text-gray-400 hidden lg:block truncate max-w-xs">{status}</span>
                )}

                {/* Mobile / Desktop toggle */}
                <button
                    onClick={() => setMobilePreview(v => !v)}
                    title="Alternar preview mobile/desktop"
                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-all ${mobilePreview ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                    {mobilePreview ? '📱 Mobile' : '🖥 Desktop'}
                </button>

                {/* Save draft */}
                <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="h-8 px-3 rounded-md text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
                </button>

                {/* Export */}
                <button
                    onClick={handleExport}
                    disabled={loading || !result}
                    className="h-8 px-4 rounded-md text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40"
                >
                    Exportar para Mailchimp →
                </button>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex-1 flex min-h-0 overflow-hidden">

                {/* ── Left Panel ── */}
                <div className="w-[340px] flex-shrink-0 flex flex-col overflow-y-auto border-r bg-white custom-scrollbar">

                    {/* Section: Perfil */}
                    <div className="border-b">
                        <SectionHeader title="Perfil do Cliente" sectionKey="perfil" openSections={openSections} toggle={toggleSection} />
                        {openSections.perfil && (
                            <div className="px-5 pb-4 space-y-2">
                                {selectedProfile ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                                        <span
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: selectedProfile.brand_color }}
                                        />
                                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{selectedProfile.name}</span>
                                        <button
                                            onClick={() => setSelectedProfile(null)}
                                            className="text-xs text-gray-400 hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400">Nenhum perfil selecionado</p>
                                )}
                                <button
                                    onClick={() => setShowProfilesModal(true)}
                                    className="w-full h-8 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Gerenciar Perfis
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section: Configurações de Envio */}
                    <div className="border-b">
                        <SectionHeader title="Configurações de Envio" sectionKey="envio" openSections={openSections} toggle={toggleSection} />
                        {openSections.envio && (
                            <div className="px-5 pb-5 space-y-4">

                                {/* Público */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Público (Mailchimp)</label>
                                    <select
                                        value={selectedListId}
                                        onChange={e => setSelectedListId(e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    >
                                        <option value="">Selecione um público...</option>
                                        {mailchimpLists.map(l => (
                                            <option key={l.id} value={l.id}>{l.name} ({l.count} contatos)</option>
                                        ))}
                                    </select>
                                    {mailchimpLists.length === 0 && (
                                        <p className="text-[11px] text-gray-400 mt-1">Servidor local não conectado ou sem listas.</p>
                                    )}
                                </div>

                                {/* Assunto */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-medium text-gray-500">Assunto</label>
                                        <div className="flex items-center gap-2.5">
                                            <span className={`text-[11px] ${subject.length > 60 ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                                                {subject.length}/60
                                            </span>
                                            <button
                                                onClick={handleSuggestSubject}
                                                disabled={suggestingSubject || (!prompt && !title)}
                                                className="text-[11px] text-brand hover:underline disabled:opacity-40 font-medium"
                                            >
                                                {suggestingSubject ? '...' : '⚡ Sugerir'}
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Linha de assunto do e-mail"
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                </div>

                                {/* Texto de Prévia */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-medium text-gray-500">Texto de Prévia</label>
                                        <span className={`text-[11px] ${previewText.length > 130 ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                                            {previewText.length}/130
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Snippet exibido antes de abrir o e-mail..."
                                        value={previewText}
                                        onChange={e => setPreviewText(e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                </div>

                                {/* Horário de Envio */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-medium text-gray-500">Horário de Envio</label>
                                        <button
                                            onClick={() => setScheduleEnabled(v => !v)}
                                            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${scheduleEnabled ? 'bg-brand' : 'bg-gray-200'}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${scheduleEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                                        </button>
                                    </div>
                                    {scheduleEnabled ? (
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            onChange={e => setScheduledAt(e.target.value)}
                                            className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                        />
                                    ) : (
                                        <p className="text-[11px] text-gray-400">Envio imediato ao exportar</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Rascunhos */}
                    <div className="border-b">
                        <SectionHeader title="Rascunhos" sectionKey="rascunhos" openSections={openSections} toggle={toggleSection} badge={drafts.length} />
                        {openSections.rascunhos && (
                            <div className="divide-y max-h-52 overflow-y-auto">
                                {drafts.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-5">Nenhum rascunho salvo.</p>
                                ) : drafts.map(draft => (
                                    <div
                                        key={draft.id}
                                        onClick={() => handleLoadDraft(draft)}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer group"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{draft.name}</p>
                                            <p className="text-[11px] text-gray-400">{draft.template_id} · {formatDate(draft.created_at)}</p>
                                        </div>
                                        <button
                                            onClick={e => handleDeleteDraft(draft.id, e)}
                                            className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 text-sm"
                                        >🗑️</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Design */}
                    <div className="border-b">
                        <SectionHeader title="Design" sectionKey="design" openSections={openSections} toggle={toggleSection} />
                        {openSections.design && (
                            <div className="px-5 pb-5 space-y-4">

                                {/* Template cards */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Template</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TEMPLATES.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setInternalTemplateId(t.id)}
                                                className={`flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all ${internalTemplateId === t.id ? 'border-brand' : 'border-gray-100 hover:border-gray-200'} ${t.id === 'boas-vindas' ? 'col-span-2 flex-row items-center' : ''}`}
                                            >
                                                {t.id === 'boas-vindas' ? (
                                                    <>
                                                        <div style={{ backgroundColor: t.color }} className="w-1.5 self-stretch flex-shrink-0" />
                                                        <div className="px-3 py-2">
                                                            <p className="text-xs font-medium text-gray-800">{t.label}</p>
                                                            <p className="text-[10px] text-gray-400">{t.desc}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ backgroundColor: getTemplateHeaderColor(t.id) }} className="h-4 w-full flex-shrink-0" />
                                                        <div className="px-2 py-1.5">
                                                            <p className="text-xs font-medium text-gray-800">{t.label}</p>
                                                            <p className="text-[10px] text-gray-400">{t.desc}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Título */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Título no e-mail</label>
                                    <input
                                        type="text"
                                        placeholder="Título visível no corpo do e-mail"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                </div>

                                {/* CTA */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Texto do botão</label>
                                        <input type="text" placeholder="Saiba mais" value={buttonText} onChange={e => setButtonText(e.target.value)}
                                            className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Link do botão</label>
                                        <input type="text" placeholder="https://..." value={buttonLink} onChange={e => setButtonLink(e.target.value)}
                                            className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                                    </div>
                                </div>

                                {/* Imagens */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-2">Imagens</label>
                                    <div className="space-y-1.5">
                                        {([
                                            { key: 'logo' as const, label: 'Logotipo', url: logoUrl },
                                            { key: 'banner' as const, label: 'Banner principal', url: bannerUrl },
                                            { key: 'bottom' as const, label: 'Imagem rodapé', url: bottomImageUrl },
                                        ]).map(({ key, label, url }) => (
                                            <label
                                                key={key}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg border border-dashed cursor-pointer hover:bg-gray-50 transition-colors ${url ? 'border-green-300 bg-green-50/40' : 'border-gray-200'}`}
                                            >
                                                <span className="text-xs font-medium text-gray-600 w-24 flex-shrink-0">{label}</span>
                                                {url
                                                    ? <span className="text-xs text-green-600 font-medium">✓ Enviada</span>
                                                    : <span className="text-xs text-gray-400">Clique para enviar</span>
                                                }
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, key)} accept="image/*" />
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Cores */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cor de fundo</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                                                className="h-9 w-9 rounded-md cursor-pointer border p-0.5 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 font-mono">{bgColor}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cor de destaque</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={buttonColor} onChange={e => setButtonColor(e.target.value)}
                                                className="h-9 w-9 rounded-md cursor-pointer border p-0.5 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 font-mono">{buttonColor}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Conteúdo IA */}
                    <div className="border-b">
                        <SectionHeader title="Conteúdo IA" sectionKey="ia" openSections={openSections} toggle={toggleSection} />
                        {openSections.ia && (
                            <div className="px-5 pb-5 space-y-3">
                                <textarea
                                    className="w-full min-h-[100px] rounded-md border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    placeholder="Descreva o que a IA deve escrever..."
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                />
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading || !prompt}
                                    className="w-full h-9 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-40"
                                >
                                    {loading ? 'Gerando...' : 'Gerar E-mail com IA'}
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* ── Right Panel: Preview ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {result ? (
                        <>
                            {/* Preview toolbar */}
                            <div className="flex-shrink-0 h-12 bg-white border-b flex items-center px-4 gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-0.5">Assunto</p>
                                    <p className="text-sm font-medium text-gray-800 truncate">{finalSubject || '(sem assunto)'}</p>
                                </div>
                                <button
                                    onClick={toggleEditMode}
                                    disabled={loading}
                                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-all flex-shrink-0 ${isEditing ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {isEditing ? '✓ Salvar edições' : '✏️ Editar texto'}
                                </button>
                            </div>

                            {/* iframe container */}
                            <div className="flex-1 bg-[#f0f2f5] overflow-auto flex justify-center p-6">
                                <div className={`bg-white shadow-xl rounded-sm overflow-hidden flex flex-col transition-all duration-300 ${mobilePreview ? 'w-[375px]' : 'w-full max-w-[650px]'}`}>
                                    <iframe
                                        ref={iframeRef}
                                        srcDoc={result.body}
                                        className="w-full flex-1 border-0 min-h-[700px]"
                                        title="Preview do Email"
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                            <div className="h-16 w-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 border border-gray-100">
                                <span className="text-2xl">✉️</span>
                            </div>
                            <h3 className="text-base font-medium text-gray-600 mb-1">Preview aparecerá aqui</h3>
                            <p className="text-sm max-w-xs">Configure o design, escreva o prompt e clique em "Gerar E-mail com IA".</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Profiles Modal ── */}
            {showProfilesModal && (
                <ProfilesModal
                    onClose={() => setShowProfilesModal(false)}
                    onSelectProfile={profile => {
                        setSelectedProfile(profile as EmailProfile);
                        setShowProfilesModal(false);
                    }}
                />
            )}

            {/* ── Checklist Modal ── */}
            {showChecklist && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">Antes de exportar</h3>
                        <p className="text-xs text-gray-400 mb-5">Revise os itens abaixo antes de enviar para o Mailchimp.</p>

                        <div className="space-y-3 mb-5">
                            {checks.map((check, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${check.ok ? 'bg-green-100 text-green-600' : check.blocking ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                                        {check.ok ? '✓' : check.blocking ? '✗' : '!'}
                                    </span>
                                    <span className={`text-sm leading-snug ${check.ok ? 'text-gray-700' : check.blocking ? 'text-red-600 font-medium' : 'text-amber-700'}`}>
                                        {check.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {scheduleEnabled && scheduledAt && (
                            <div className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2.5">
                                📅 Agendado para {new Date(scheduledAt).toLocaleString('pt-BR')}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowChecklist(false)}
                                className="flex-1 h-9 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateCampaign}
                                disabled={!canSend}
                                className="flex-1 h-9 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                            >
                                {canSend ? 'Exportar →' : 'Corrija os erros'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

