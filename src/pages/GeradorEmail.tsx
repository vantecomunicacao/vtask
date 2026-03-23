import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspaceStore } from '../store/workspaceStore';
import { toast } from 'sonner';
import { EmailSidebar } from '../components/email/EmailSidebar';
import { EmailPreviewPanel } from '../components/email/EmailPreviewPanel';
import { ProfilesModal } from '../components/email/ProfilesModal';
import { EmailChecklistModal } from '../components/email/EmailChecklistModal';
import type { EmailProfile, EmailDraft } from '../lib/emailTypes';
import { callEmailApi } from '../lib/emailApi';

export type SectionKey = 'perfil' | 'envio' | 'rascunhos' | 'design' | 'ia';

export default function GeradorEmail() {
    const activeWorkspace = useWorkspaceStore(state => state.activeWorkspace);
    const workspaceId = activeWorkspace?.id;
    const [profiles, setProfiles] = useState<EmailProfile[]>([]);
    const [selectedProfile, setSelectedProfile] = useState<EmailProfile | null>(null);
    const [drafts, setDrafts] = useState<EmailDraft[]>([]);
    
    // UI States
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        perfil: true, envio: false, rascunhos: false, design: false, ia: false
    });
    const [showProfilesModal, setShowProfilesModal] = useState(false);
    const [showChecklist, setShowChecklist] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [mobilePreview, setMobilePreview] = useState(false);
    const [emailName, setEmailName] = useState('Novo E-mail Sem Título');
    const [isEditingName, setIsEditingName] = useState(false);

    // Design States
    const [internalTemplateId, setInternalTemplateId] = useState('newsletter');
    const [title, setTitle] = useState('');
    const [buttonText, setButtonText] = useState('CLIQUE AQUI');
    const [buttonLink, setButtonLink] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [bottomImageUrl, setBottomImageUrl] = useState('');
    const [bgColor, setBgColor] = useState('#f4f4f4');
    const [buttonColor, setButtonColor] = useState('#db4035');
    const [headerColor, setHeaderColor] = useState('#db4035');

    // Content States
    const [prompt, setPrompt] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [subject, setSubject] = useState('');
    const [previewText, setPreviewText] = useState('');
    const [result, setResult] = useState<{ subject: string; body: string } | null>(null);

    // Sending States
    const [mailchimpLists, setMailchimpLists] = useState<any[]>([]);
    const [selectedListId, setSelectedListId] = useState('');
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [suggestingSubject, setSuggestingSubject] = useState(false);

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
            callEmailApi('/api/client-mailchimp-lists', {
                apiKey: selectedProfile.mailchimp_api_key,
                server: selectedProfile.mailchimp_server,
            }).then(d => {
                if (d.lists) {
                    setMailchimpLists(d.lists);
                    if (selectedProfile.mailchimp_list_id) setSelectedListId(selectedProfile.mailchimp_list_id);
                }
            }).catch(() => { });
        }
    }, [selectedProfile]);

    useEffect(() => {
        if (!workspaceId) return;
        loadDrafts();
        supabase.from('email_profiles').select('*').order('name')
            .then(({ data }) => { if (data) setProfiles(data as EmailProfile[]); });
    }, [workspaceId]);

    const loadDrafts = async () => {
        if (!workspaceId) return;
        const { data } = await supabase.from('email_drafts').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
        if (data) setDrafts(data as EmailDraft[]);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner' | 'bottom') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await supabase.storage.from('email_images').upload(`public/${fileName}`, file);
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('email_images').getPublicUrl(`public/${fileName}`);
            if (data.publicUrl) {
                if (target === 'logo') setLogoUrl(data.publicUrl);
                if (target === 'banner') setBannerUrl(data.publicUrl);
                if (target === 'bottom') setBottomImageUrl(data.publicUrl);
                toast.success('Imagem enviada!');
            }
        } catch (err: any) {
            toast.error('Erro no upload: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt) { toast.error('Digite um comando para a IA'); return; }
        setLoading(true);
        setIsEditing(false);
        try {
            const data = await callEmailApi('/api/generate-email', {
                prompt, logoUrl, bannerUrl, bottomImageUrl,
                buttonText, buttonLink, title, bgColor, buttonColor, headerColor,
                internalTemplateId, previewText,
                clientContext: selectedProfile?.ai_prompt,
                openaiApiKey: openaiKey || undefined,
                ctaEnabled: selectedProfile?.cta_enabled ?? true,
                emailLength: selectedProfile?.email_length ?? 'medium',
            });
            setResult({ subject: data.subject, body: data.body });
            if (!subject) setSubject(data.subject);
            if (!previewText && data.preview) setPreviewText(data.preview);
            toast.success('Conteúdo gerado!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestSubject = async () => {
        setSuggestingSubject(true);
        try {
            const data = await callEmailApi('/api/suggest-subject', { 
                prompt, title, 
                clientContext: selectedProfile?.ai_prompt, 
                openaiApiKey: openaiKey || undefined 
            });
            if (data.subject) setSubject(data.subject);
            toast.success('Sugestão aplicada!');
        } catch {
            toast.error('Erro ao sugerir.');
        } finally {
            setSuggestingSubject(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!workspaceId) return;
        const name = window.prompt('Nome do rascunho:', emailName);
        if (!name?.trim()) return;
        setLoading(true);
        const { error } = await supabase.from('email_drafts').insert({
            workspace_id: workspaceId,
            name: name.trim(),
            template_id: internalTemplateId,
            title, prompt,
            logo_url: logoUrl, banner_url: bannerUrl,
            button_text: buttonText, button_link: buttonLink,
            bg_color: bgColor, button_color: buttonColor,
            generated_html: result?.body,
            generated_subject: subject || result?.subject
        });
        if (error) toast.error('Erro ao salvar rascunho.');
        else { toast.success('Rascunho salvo!'); loadDrafts(); }
        setLoading(false);
    };

    const handleLoadDraft = (draft: any) => {
        setInternalTemplateId(draft.template_id);
        setTitle(draft.title || '');
        setPrompt(draft.prompt || '');
        setLogoUrl(draft.logo_url || '');
        setBannerUrl(draft.banner_url || '');
        setButtonText(draft.button_text || '');
        setButtonLink(draft.button_link || '');
        setBgColor(draft.bg_color || '#f4f4f4');
        setButtonColor(draft.button_color || '#db4035');
        if (draft.generated_subject) setSubject(draft.generated_subject);
        if (draft.generated_html) setResult({ subject: draft.generated_subject || '', body: draft.generated_html });
        toast.success('Rascunho carregado.');
    };

    const handleCreateCampaign = async () => {
        setShowChecklist(false);
        setLoading(true);
        try {
            await callEmailApi('/api/create-campaign', {
                subject: subject || result?.subject,
                htmlContent: result?.body,
                listId: selectedListId || undefined,
                previewText,
                scheduleTime: scheduleEnabled && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                apiKey: selectedProfile?.mailchimp_api_key,
                serverPrefix: selectedProfile?.mailchimp_server,
            });
            toast.success('Campanha enviada para o Mailchimp!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg-main overflow-hidden p-4">
            <div className="flex-1 flex flex-col min-h-0 rounded-3xl border border-border-subtle shadow-2xl bg-surface-card overflow-hidden">
                <div className="h-16 border-b border-border-subtle flex items-center px-6 gap-4 bg-surface-card sticky top-0 z-20">
                    <button onClick={() => setIsEditingName(true)} className="text-lg font-black text-primary hover:text-brand transition-colors truncate max-w-sm tracking-tight uppercase">
                        {isEditingName ? (
                            <input autoFocus value={emailName} onChange={e => setEmailName(e.target.value)} onBlur={() => setIsEditingName(false)} className="bg-transparent border-b-2 border-brand outline-none" />
                        ) : emailName}
                    </button>
                    <div className="flex-1" />
                    <button onClick={handleSaveDraft} disabled={loading} className="h-10 px-6 rounded-xl text-[10px] font-black border border-border-subtle hover:bg-surface-2 transition-all uppercase tracking-widest">
                        SALVAR RASCUNHO
                    </button>
                    <button onClick={() => setShowChecklist(true)} disabled={!result || loading} className="h-10 px-6 rounded-xl text-[10px] font-black bg-brand text-white shadow-lg shadow-brand/20 hover:scale-105 transition-all disabled:opacity-50 uppercase tracking-widest">
                        EXPORTAR CAMPANHA →
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <EmailSidebar
                        openSections={openSections} toggleSection={k => setOpenSections(p => ({ ...p, [k]: !p[k] }))}
                        profiles={profiles} selectedProfile={selectedProfile} onProfileChange={setSelectedProfile} onManageProfiles={() => setShowProfilesModal(true)}
                        mailchimpLists={mailchimpLists} selectedListId={selectedListId} onListChange={setSelectedListId}
                        subject={subject} onSubjectChange={setSubject} previewText={previewText} onPreviewTextChange={setPreviewText}
                        scheduleEnabled={scheduleEnabled} onScheduleToggle={() => setScheduleEnabled(!scheduleEnabled)} scheduledAt={scheduledAt} onScheduledAtChange={setScheduledAt}
                        suggestingSubject={suggestingSubject} onSuggestSubject={handleSuggestSubject}
                        drafts={drafts} onLoadDraft={handleLoadDraft} onDeleteDraft={async (id) => { await supabase.from('email_drafts').delete().eq('id', id); loadDrafts(); }} formatDate={d => new Date(d).toLocaleDateString()}
                        internalTemplateId={internalTemplateId} onTemplateChange={setInternalTemplateId} title={title} onTitleChange={setTitle}
                        buttonText={buttonText} onButtonTextChange={setButtonText} buttonLink={buttonLink} onButtonLinkChange={setButtonLink}
                        logoUrl={logoUrl} bannerUrl={bannerUrl} bottomImageUrl={bottomImageUrl} onFileUpload={handleFileUpload}
                        bgColor={bgColor} onBgColorChange={setBgColor} buttonColor={buttonColor} onButtonColorChange={setButtonColor}
                        getTemplateHeaderColor={() => headerColor}
                        openaiKey={openaiKey} onOpenaiKeyChange={setOpenaiKey} showOpenaiKey={false} onToggleShowKey={() => {}}
                        savingOpenaiKey={false} onSaveKey={async () => {}}
                        prompt={prompt} onPromptChange={setPrompt} loading={loading} onGenerate={handleGenerate}
                    />

                    <EmailPreviewPanel
                        result={result} mobilePreview={mobilePreview} setMobilePreview={setMobilePreview}
                        isEditing={isEditing} onToggleEditMode={() => setIsEditing(!isEditing)}
                        finalSubject={subject || result?.subject || ''} loading={loading}
                    />
                </div>
            </div>

            {showProfilesModal && <ProfilesModal onClose={() => { setShowProfilesModal(false); loadDrafts(); }} onSelectProfile={p => { setSelectedProfile(p); setShowProfilesModal(false); }} />}
            {showChecklist && <EmailChecklistModal checks={[]} canSend={true} scheduleEnabled={scheduleEnabled} scheduledAt={scheduledAt} onClose={() => setShowChecklist(false)} onConfirm={handleCreateCampaign} />}
        </div>
    );
}
