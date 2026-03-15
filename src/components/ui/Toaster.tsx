import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="bottom-right"
            toastOptions={{
                className: 'bg-surface-card border border-border-subtle shadow-float rounded-card flex items-center gap-3 px-4 py-3 font-sans text-sm text-primary',
                descriptionClassName: 'text-secondary',
                classNames: {
                    success: 'border-green-200 bg-green-50 text-green-800',
                    error: 'border-red-200 bg-red-50 text-red-800',
                },
            }}
        />
    );
}
