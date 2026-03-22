export type EmailDraft = {
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

export type MailchimpList = { id: string; name: string; count: number };

export type SectionKey = 'perfil' | 'envio' | 'rascunhos' | 'design' | 'ia';

export type EmailProfile = {
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
    openai_api_key: string | null;
    cta_enabled: boolean;
    email_length: 'short' | 'medium' | 'long';
    button_color: string;
    sender_name: string | null;
    sender_email: string | null;
};

export type EmailSchedule = {
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
};

export type ScheduleFormData = Omit<EmailSchedule, 'id' | 'profile_id' | 'last_run_at' | 'next_run_at'>;
export type ProfileFormData = Omit<EmailProfile, 'id'>;

export const CRON_PRESETS = [
    { label: 'Todo dia às 9h', value: '0 9 * * *' },
    { label: 'Toda segunda às 9h', value: '0 9 * * 1' },
    { label: 'Toda terça às 9h', value: '0 9 * * 2' },
    { label: 'Toda quarta às 9h', value: '0 9 * * 3' },
    { label: 'Toda quinta às 9h', value: '0 9 * * 4' },
    { label: 'Toda sexta às 9h', value: '0 9 * * 5' },
    { label: 'Quinzenalmente às 9h', value: '0 9 1,15 * *' },
    { label: 'Personalizado', value: '__custom__' },
];

export function describeCron(expr: string): string {
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

export const TEMPLATES = [
    { id: 'newsletter', label: 'Newsletter', desc: 'Cabeçalho colorido', color: '' },
    { id: 'comunicado', label: 'Comunicado', desc: 'Borda superior', color: '#2563eb' },
    { id: 'promocao', label: 'Promoção', desc: 'Header escuro', color: '#111827' },
    { id: 'alerta', label: 'Alerta', desc: 'Banner vermelho', color: '#ef4444' },
    { id: 'boas-vindas', label: 'Boas-Vindas', desc: 'Onboarding', color: '#22c55e' },
] as const;
