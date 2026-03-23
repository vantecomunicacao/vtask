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
