import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="bottom-right"
            toastOptions={{
                className: 'bg-surface-card border border-border-subtle shadow-float rounded-[var(--radius-card)] flex items-center gap-3 px-4 py-3 font-sans text-sm text-primary',
                descriptionClassName: 'text-secondary',
            }}
        />
    );
}
