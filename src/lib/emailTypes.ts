export type SectionKey = 'perfil' | 'ia' | 'design' | 'envio' | 'rascunhos';

export interface ProfileFormData {
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
    cta_enabled?: boolean;
    email_length?: 'short' | 'medium' | 'long';
    button_color?: string;
    sender_name?: string;
    sender_email?: string;
    font_family?: string;
}

export interface EmailFont {
    label: string;
    value: string;
    google?: string; // nome para a URL do Google Fonts
    preview: string; // font-family CSS para preview no seletor
}

export const EMAIL_FONTS: EmailFont[] = [
    { label: 'Helvetica (Padrão)',   value: 'Helvetica Neue, Helvetica, Arial, sans-serif', preview: 'Helvetica Neue, Helvetica, Arial, sans-serif' },
    { label: 'Montserrat',           value: 'Montserrat, Arial, sans-serif',                  google: 'Montserrat',        preview: 'Montserrat, sans-serif' },
    { label: 'Open Sans',            value: 'Open Sans, Arial, sans-serif',                   google: 'Open+Sans',         preview: 'Open Sans, sans-serif' },
    { label: 'Georgia (Serif)',      value: "Georgia, 'Times New Roman', serif",              preview: 'Georgia, serif' },
    { label: 'Playfair Display',     value: 'Playfair Display, Georgia, serif',               google: 'Playfair+Display',  preview: 'Playfair Display, Georgia, serif' },
    { label: 'Verdana',              value: 'Verdana, Geneva, sans-serif',                    preview: 'Verdana, sans-serif' },
];

export interface EmailProfile {
  id: string;
  name: string;
  sender_name?: string;
  sender_email?: string;
  mailchimp_api_key?: string;
  mailchimp_server?: string;
  mailchimp_list_id?: string;
  brand_color?: string;
  button_color?: string;
  logo_url?: string;
  banner_url?: string;
  ai_prompt?: string;
  cta_enabled?: boolean;
  email_length?: 'short' | 'medium' | 'long';
  default_button_text?: string;
  default_button_link?: string;
  font_family?: string;
  created_at?: string;
  workspace_id?: string;
  test_email?: string;
}

export interface EmailSchedule {
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

export interface ScheduleFormData {
  name: string;
  cron_expression: string;
  template_id: string;
  prompt_override: string | null;
  bg_color: string;
  button_color: string;
  button_text: string | null;
  button_link: string | null;
  is_dynamic_theme: boolean;
}

export const CRON_PRESETS = [
  { label: 'Toda segunda às 09:00', value: '0 9 * * 1' },
  { label: 'Toda quarta às 09:00', value: '0 9 * * 3' },
  { label: 'Toda sexta às 15:00', value: '0 15 * * 5' },
  { label: 'Todo dia às 08:00', value: '0 8 * * *' },
  { label: 'Personalizado...', value: '__custom__' },
];

export function describeCron(cron: string): string {
  if (cron === '0 9 * * 1') return 'Segundas às 09h';
  if (cron === '0 9 * * 3') return 'Quartas às 09h';
  if (cron === '0 15 * * 5') return 'Sextas às 15h';
  if (cron === '0 8 * * *') return 'Diário às 08h';
  return cron;
}

export interface EmailDraft {
  id: string;
  name: string;
  template_id: string;
  title?: string;
  prompt?: string;
  logo_url?: string;
  banner_url?: string;
  bottom_image_url?: string;
  button_text?: string;
  button_link?: string;
  bg_color?: string;
  button_color?: string;
  generated_html?: string;
  generated_subject?: string;
  created_at?: string;
  workspace_id?: string;
}

export interface MailchimpList {
  id: string;
  name: string;
  count: number;
}

export interface MJMLConfig {
  title: string;
  logoUrl: string;
  bannerUrl: string;
  bottomImageUrl: string;
  buttonText: string;
  buttonLink: string;
  bgColor: string;
  buttonColor: string;
  content?: string;
}

export interface MJMLTemplate {
  id: string;
  label: string;
  desc: string;
  color: string;
}

export const TEMPLATES: MJMLTemplate[] = [
  { id: 'newsletter',   label: 'Minimalista',          desc: 'Foco total no texto e clareza visual.',           color: '#111827' },
  { id: 'promocao',     label: 'Moderno',               desc: 'Elementos visuais elegantes e espaçados.',        color: '#0EA5E9' },
  { id: 'comunicado',   label: 'Corporativo',           desc: 'Visual sóbrio para comunicações oficiais.',       color: '#334155' },
  { id: 'boas-vindas',  label: 'Boas-vindas',           desc: 'Design clean com destaque de apresentação.',      color: '#4F46E5' },
  { id: 'alerta',       label: 'Alerta / Urgência',     desc: 'Header vermelho para comunicados importantes.',   color: '#ef4444' },
];
