export const typography = {
    pageTitle:    'text-2xl font-bold text-primary',
    sectionTitle: 'text-lg font-bold text-primary',
    cardTitle:    'text-base font-semibold text-primary',
    body:         'text-sm text-primary',
    label:        'text-xs font-semibold text-secondary uppercase tracking-wide',
    micro:        'text-[10px] font-black uppercase tracking-widest text-muted',
} as const;

export const modalSizes = {
    sm:   'max-w-md',
    md:   'max-w-lg',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-5xl',
} as const;

export type ModalSize = keyof typeof modalSizes;

export const CHART_PALETTE = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
] as const;
