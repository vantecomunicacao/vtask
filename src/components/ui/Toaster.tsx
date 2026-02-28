import { Toaster as Sonner } from 'sonner';

export function Toaster() {
    return (
        <Sonner
            position="bottom-right"
            toastOptions={{
                className: 'bg-white border border-border-subtle shadow-lg rounded-xl flex items-center gap-3 px-4 py-3 font-sans text-sm text-gray-900',
                descriptionClassName: 'text-gray-500',
                classNames: {
                    success: 'border-green-200 bg-green-50 text-green-800',
                    error: 'border-red-200 bg-red-50 text-red-800',
                },
            }}
        />
    );
}
