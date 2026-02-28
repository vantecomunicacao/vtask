import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

export function Dialog({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }: DialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
            <div
                ref={overlayRef}
                className="absolute inset-0"
                onClick={onClose}
            />
            <div
                className={`relative w-full ${maxWidth} bg-white rounded-xl shadow-xl border border-border-subtle flex flex-col max-h-[90vh] popup-spring`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-gray-50/50 rounded-t-xl shrink-0">
                    <h2 id="dialog-title" className="text-lg font-bold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
