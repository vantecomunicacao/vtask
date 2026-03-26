import type { SectionKey } from '../../pages/GeradorEmail';
import type { EmailProfile, EmailDraft, MailchimpList } from '../../lib/emailTypes';
import { EmailPerfilSection } from './EmailPerfilSection';
import { EmailEnvioSection } from './EmailEnvioSection';
import { EmailRascunhosSection } from './EmailRascunhosSection';
import { EmailDesignSection } from './EmailDesignSection';
import { EmailIASection } from './EmailIASection';

interface EmailSidebarProps {
  openSections: Record<SectionKey, boolean>;
  toggleSection: (key: SectionKey) => void;
  // Perfil
  profiles: EmailProfile[];
  selectedProfile: EmailProfile | null;
  onProfileChange: (p: EmailProfile | null) => void;
  onManageProfiles: () => void;
  // Envio
  mailchimpLists: MailchimpList[];
  selectedListId: string;
  onListChange: (id: string) => void;
  subject: string;
  onSubjectChange: (s: string) => void;
  previewText: string;
  onPreviewTextChange: (s: string) => void;
  scheduleEnabled: boolean;
  onScheduleToggle: () => void;
  scheduledAt: string;
  onScheduledAtChange: (s: string) => void;
  suggestingSubject: boolean;
  onSuggestSubject: () => void;
  // Rascunhos
  drafts: EmailDraft[];
  onLoadDraft: (d: EmailDraft) => void;
  onDeleteDraft: (id: string, e: React.MouseEvent) => void;
  formatDate: (iso: string) => string;
  // Design
  internalTemplateId: string;
  onTemplateChange: (id: string) => void;
  title: string;
  onTitleChange: (s: string) => void;
  buttonText: string;
  onButtonTextChange: (s: string) => void;
  buttonLink: string;
  onButtonLinkChange: (s: string) => void;
  logoUrl: string;
  bannerUrl: string;
  bottomImageUrl: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner' | 'bottom') => void;
  bgColor: string;
  onBgColorChange: (s: string) => void;
  buttonColor: string;
  onButtonColorChange: (s: string) => void;
  getTemplateHeaderColor: () => string;
  // IA
  prompt: string;
  onPromptChange: (s: string) => void;
  loading: boolean;
  onGenerate: () => void;
}

export function EmailSidebar(props: EmailSidebarProps) {
  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col overflow-y-auto border-r border-border-subtle bg-surface-card custom-scrollbar">
      <EmailPerfilSection
        openSections={props.openSections}
        toggle={props.toggleSection}
        profiles={props.profiles}
        selectedProfile={props.selectedProfile}
        onProfileChange={props.onProfileChange}
        onManageProfiles={props.onManageProfiles}
      />
      
      <EmailIASection
        openSections={props.openSections}
        toggle={props.toggleSection}
        prompt={props.prompt}
        onPromptChange={props.onPromptChange}
        loading={props.loading}
        onGenerate={props.onGenerate}
      />

      <EmailDesignSection
        openSections={props.openSections}
        toggle={props.toggleSection}
        internalTemplateId={props.internalTemplateId}
        onTemplateChange={props.onTemplateChange}
        title={props.title}
        onTitleChange={props.onTitleChange}
        buttonText={props.buttonText}
        onButtonTextChange={props.onButtonTextChange}
        buttonLink={props.buttonLink}
        onButtonLinkChange={props.onButtonLinkChange}
        logoUrl={props.logoUrl}
        bannerUrl={props.bannerUrl}
        bottomImageUrl={props.bottomImageUrl}
        onFileUpload={props.onFileUpload}
        bgColor={props.bgColor}
        onBgColorChange={props.onBgColorChange}
        buttonColor={props.buttonColor}
        onButtonColorChange={props.onButtonColorChange}
        getTemplateHeaderColor={props.getTemplateHeaderColor}
      />

      <EmailEnvioSection
        openSections={props.openSections}
        toggle={props.toggleSection}
        mailchimpLists={props.mailchimpLists}
        selectedListId={props.selectedListId}
        onListChange={props.onListChange}
        subject={props.subject}
        onSubjectChange={props.onSubjectChange}
        previewText={props.previewText}
        onPreviewTextChange={props.onPreviewTextChange}
        scheduleEnabled={props.scheduleEnabled}
        onScheduleToggle={props.onScheduleToggle}
        scheduledAt={props.scheduledAt}
        onScheduledAtChange={props.onScheduledAtChange}
        suggestingSubject={props.suggestingSubject}
        onSuggestSubject={props.onSuggestSubject}
        canSuggest={!!(props.prompt || props.title)}
      />

      <EmailRascunhosSection
        openSections={props.openSections}
        toggle={props.toggleSection}
        drafts={props.drafts}
        onLoad={props.onLoadDraft}
        onDelete={props.onDeleteDraft}
        formatDate={props.formatDate}
      />
    </div>
  );
}
