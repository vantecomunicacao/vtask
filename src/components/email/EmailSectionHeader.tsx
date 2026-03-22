import type { SectionKey } from './emailTypes';

interface Props {
    title: string;
    sectionKey: SectionKey;
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    badge?: number;
}

export function EmailSectionHeader({ title, sectionKey, openSections, toggle, badge }: Props) {
    return (
        <button
            onClick={() => toggle(sectionKey)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-2 transition-colors text-left"
        >
            <span className="text-sm font-medium text-primary flex items-center gap-2">
                {title}
                {badge !== undefined && badge > 0 && (
                    <span className="text-[11px] bg-surface-0 text-secondary px-1.5 py-0.5 rounded-full leading-none">{badge}</span>
                )}
            </span>
            <span className="text-muted text-[10px]">{openSections[sectionKey] ? '▲' : '▼'}</span>
        </button>
    );
}
