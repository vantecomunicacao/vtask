export interface EmailProfile {
  id: string;
  name: string;
  sender_name?: string;
  sender_email?: string;
  mailchimp_api_key?: string;
  mailchimp_server?: string;
  mailchimp_list_id?: string;
  openai_api_key?: string;
  brand_color?: string;
  button_color?: string;
  logo_url?: string;
  banner_url?: string;
  ai_prompt?: string;
  cta_enabled?: boolean;
  email_length?: 'short' | 'medium' | 'long';
  default_button_text?: string;
  default_button_link?: string;
  created_at?: string;
  workspace_id?: string;
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
  { id: 'boas-vindas', label: 'Boas-vindas (Destaque)', desc: 'Design clean com banner lateral destacado.', color: '#4F46E5' },
  { id: 'minimalist', label: 'Minimalista', desc: 'Foco total no texto e clareza visual.', color: '#111827' },
  { id: 'modern', label: 'Moderno', desc: 'Elementos visuais elegantes e espaçados.', color: '#0EA5E9' },
  { id: 'corp', label: 'Corporativo', desc: 'Visual sóbrio para comunicações oficiais.', color: '#334155' },
];
