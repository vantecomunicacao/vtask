import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { toast } from 'sonner';
import { ProfilesModal } from '../components/email/ProfilesModal';
import { EmailPerfilSection } from '../components/email/EmailPerfilSection';
import { EmailEnvioSection } from '../components/email/EmailEnvioSection';
import { EmailRascunhosSection } from '../components/email/EmailRascunhosSection';
import { EmailDesignSection } from '../components/email/EmailDesignSection';
import { EmailIASection } from '../components/email/EmailIASection';
import { EmailPreviewPanel } from '../components/email/EmailPreviewPanel';
import { EmailChecklistModal } from '../components/email/EmailChecklistModal';
import type { EmailDraft, EmailProfile, MailchimpList, SectionKey } from '../components/email/emailTypes';
import { TEMPLATES } from '../components/email/emailTypes';

const SERVER_BASE = 'http://localhost:3001';
const SERVER_KEY = import.meta.env.VITE_SERVER_API_KEY || '';
const authHeader = SERVER_KEY ? { Authorization: `Bearer ${SERVER_KEY}` } : {};

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
    const [headerColor, setHeaderColor] = useState('#db4035');

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
    const [profiles, setProfiles] = useState<EmailProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<EmailProfile | null>(null);
    const [showProfilesModal, setShowProfilesModal] = useState(false);

    // OpenAI key (per profile)
    const [openaiKey, setOpenaiKey] = useState('');
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [savingOpenaiKey, setSavingOpenaiKey] = useState(false);

    // Apply profile settings when selected
    useEffect(() => {
        if (!selectedProfile) return;
        setButtonColor(selectedProfile.button_color || '#db4035');
        setHeaderColor(selectedProfile.brand_color || '#db4035');
        if (selectedProfile.logo_url) setLogoUrl(selectedProfile.logo_url);
        if (selectedProfile.banner_url) setBannerUrl(selectedProfile.banner_url);
        if (selectedProfile.ai_prompt && !prompt) setPrompt(selectedProfile.ai_prompt);
        if (selectedProfile.default_button_text) setButtonText(selectedProfile.default_button_text);
        if (selectedProfile.default_button_link) setButtonLink(selectedProfile.default_button_link);
        setOpenaiKey(selectedProfile.openai_api_key ?? '');
        if (selectedProfile.mailchimp_api_key && selectedProfile.mailchimp_server) {
            fetch(`${SERVER_BASE}/api/client-mailchimp-lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
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

    useEffect(() => {
        if (!workspaceId) return;
        loadDrafts();
        cleanupOldImages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    useEffect(() => {
        supabase.from('email_profiles').select('*').order('name')
            .then(({ data }) => { if (data) setProfiles(data as EmailProfile[]); });
    }, []);

    useEffect(() => {
        fetch(`${SERVER_BASE}/api/mailchimp-lists`, { headers: { ...authHeader } })
            .then(r => r.json())
            .then(d => { if (d.lists) setMailchimpLists(d.lists); })
            .catch(() => { });
    }, []);

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

    const handleSaveOpenaiKey = async () => {
        if (!selectedProfile) return;
        setSavingOpenaiKey(true);
        try {
            const { error } = await supabase
                .from('email_profiles')
                .update({ openai_api_key: openaiKey.trim() || null })
                .eq('id', selectedProfile.id);
            if (error) throw error;
            setSelectedProfile(p => p ? { ...p, openai_api_key: openaiKey.trim() || null } : p);
            toast.success('Chave salva no perfil!');
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setSavingOpenaiKey(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        setIsEditing(false);
        setStatus('Gerando conteúdo com IA...');
        try {
            const res = await fetch(`${SERVER_BASE}/api/generate-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({
                    prompt, logoUrl, bannerUrl, bottomImageUrl,
                    buttonText, buttonLink, title, bgColor, buttonColor, headerColor,
                    internalTemplateId, previewText,
                    clientContext: selectedProfile?.ai_prompt,
                    profileName: selectedProfile?.name,
                    openaiApiKey: openaiKey || undefined,
                    ctaEnabled: selectedProfile?.cta_enabled ?? true,
                    emailLength: selectedProfile?.email_length ?? 'medium',
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult({ subject: data.subject, body: data.body });
            if (!subject) setSubject(data.subject);
            if (!previewText && data.preview) setPreviewText(data.preview);
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
            const res = await fetch(`${SERVER_BASE}/api/suggest-subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
                body: JSON.stringify({ prompt, title, clientContext: selectedProfile?.ai_prompt, openaiApiKey: openaiKey || undefined }),
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
            const res = await fetch(`${SERVER_BASE}/api/create-campaign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeader },
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
                    fromName: selectedProfile?.sender_name || undefined,
                    replyTo: selectedProfile?.sender_email || undefined,
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
        <div className="h-full flex flex-col bg-bg-main">
            <div className="flex-1 flex flex-col min-h-0 rounded-card border border-border-subtle shadow-card overflow-hidden">

            {/* ── Top Bar ── */}
            <div className="flex-shrink-0 h-14 bg-surface-card border-b border-border-subtle flex items-center px-5 gap-3">
                {isEditingName ? (
                    <input
                        ref={nameInputRef}
                        value={emailName}
                        onChange={e => setEmailName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
                        className="text-sm font-semibold bg-transparent border-b border-border-subtle outline-none w-44"
                    />
                ) : (
                    <button
                        onClick={() => setIsEditingName(true)}
                        title="Clique para renomear"
                        className="text-sm font-semibold text-primary hover:text-secondary transition-colors max-w-44 truncate"
                    >
                        {emailName}
                    </button>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-0 text-secondary flex-shrink-0">
                    {result ? 'Pronto' : 'Rascunho'}
                </span>
                <div className="flex-1" />
                {status && (
                    <span className="text-xs text-muted hidden lg:block truncate max-w-xs">{status}</span>
                )}
                <button
                    onClick={() => setMobilePreview(v => !v)}
                    title="Alternar preview mobile/desktop"
                    className={`h-8 px-3 rounded-md text-xs font-medium border transition-all ${mobilePreview ? 'bg-gray-900 text-white border-gray-900' : 'bg-surface-card text-secondary border-border-subtle hover:bg-surface-2'}`}
                >
                    {mobilePreview ? '📱 Mobile' : '🖥 Desktop'}
                </button>
                <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="h-8 px-3 rounded-md text-xs font-medium border border-border-subtle bg-surface-card text-secondary hover:bg-surface-2 transition-colors disabled:opacity-50"
                >
                    {savingDraft ? 'Salvando...' : 'Salvar rascunho'}
                </button>
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
                <div className="w-[340px] flex-shrink-0 flex flex-col overflow-y-auto border-r border-border-subtle bg-surface-card custom-scrollbar">
                    <EmailPerfilSection
                        openSections={openSections}
                        toggle={toggleSection}
                        profiles={profiles}
                        selectedProfile={selectedProfile}
                        onProfileChange={setSelectedProfile}
                        onManageProfiles={() => setShowProfilesModal(true)}
                    />
                    <EmailEnvioSection
                        openSections={openSections}
                        toggle={toggleSection}
                        mailchimpLists={mailchimpLists}
                        selectedListId={selectedListId}
                        onListChange={setSelectedListId}
                        subject={subject}
                        onSubjectChange={setSubject}
                        previewText={previewText}
                        onPreviewTextChange={setPreviewText}
                        scheduleEnabled={scheduleEnabled}
                        onScheduleToggle={() => setScheduleEnabled(v => !v)}
                        scheduledAt={scheduledAt}
                        onScheduledAtChange={setScheduledAt}
                        suggestingSubject={suggestingSubject}
                        onSuggestSubject={handleSuggestSubject}
                        canSuggest={!!(prompt || title)}
                    />
                    <EmailRascunhosSection
                        openSections={openSections}
                        toggle={toggleSection}
                        drafts={drafts}
                        onLoad={handleLoadDraft}
                        onDelete={handleDeleteDraft}
                        formatDate={formatDate}
                    />
                    <EmailDesignSection
                        openSections={openSections}
                        toggle={toggleSection}
                        internalTemplateId={internalTemplateId}
                        onTemplateChange={setInternalTemplateId}
                        title={title}
                        onTitleChange={setTitle}
                        buttonText={buttonText}
                        onButtonTextChange={setButtonText}
                        buttonLink={buttonLink}
                        onButtonLinkChange={setButtonLink}
                        logoUrl={logoUrl}
                        bannerUrl={bannerUrl}
                        bottomImageUrl={bottomImageUrl}
                        onFileUpload={handleFileUpload}
                        bgColor={bgColor}
                        onBgColorChange={setBgColor}
                        buttonColor={buttonColor}
                        onButtonColorChange={setButtonColor}
                        getTemplateHeaderColor={getTemplateHeaderColor}
                    />
                    <EmailIASection
                        openSections={openSections}
                        toggle={toggleSection}
                        openaiKey={openaiKey}
                        onOpenaiKeyChange={setOpenaiKey}
                        showOpenaiKey={showOpenaiKey}
                        onToggleShowKey={() => setShowOpenaiKey(v => !v)}
                        savingOpenaiKey={savingOpenaiKey}
                        onSaveKey={handleSaveOpenaiKey}
                        selectedProfile={selectedProfile}
                        prompt={prompt}
                        onPromptChange={setPrompt}
                        loading={loading}
                        onGenerate={handleGenerate}
                    />
                </div>

                {/* ── Right Panel: Preview ── */}
                <div className="flex-1 flex flex-col min-w-0">
                    <EmailPreviewPanel
                        result={result}
                        mobilePreview={mobilePreview}
                        iframeRef={iframeRef}
                        isEditing={isEditing}
                        onToggleEditMode={toggleEditMode}
                        finalSubject={finalSubject}
                        loading={loading}
                    />
                </div>
            </div>

            {/* ── Profiles Modal ── */}
            {showProfilesModal && (
                <ProfilesModal
                    onClose={() => {
                        setShowProfilesModal(false);
                        supabase.from('email_profiles').select('*').order('name')
                            .then(({ data }) => { if (data) setProfiles(data as EmailProfile[]); });
                    }}
                    onSelectProfile={profile => {
                        setSelectedProfile(profile as EmailProfile);
                        setShowProfilesModal(false);
                    }}
                />
            )}

            {/* ── Checklist Modal ── */}
            {showChecklist && (
                <EmailChecklistModal
                    checks={checks}
                    canSend={canSend}
                    scheduleEnabled={scheduleEnabled}
                    scheduledAt={scheduledAt}
                    onClose={() => setShowChecklist(false)}
                    onConfirm={handleCreateCampaign}
                />
            )}
            </div>
        </div>
    );
}
