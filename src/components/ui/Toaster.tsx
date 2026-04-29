import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="bottom-right"
            classNames={{
                toast: 'bg-surface-card border border-border-subtle shadow-float rounded-[var(--radius-card)] font-sans text-sm text-primary',
                description: 'text-secondary',
                actionButton: 'bg-brand text-white rounded-[var(--radius-sm)] text-xs font-semibold px-2.5 py-1 cursor-pointer border-none hover:opacity-90',
                cancelButton: 'bg-surface-1 text-secondary rounded-[var(--radius-sm)] text-xs font-semibold px-2.5 py-1 cursor-pointer border-none',
            }}
        />
    );
}
