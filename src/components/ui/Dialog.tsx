import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: string;
    headerActions?: React.ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({ isOpen, onClose, title, children, maxWidth = 'max-w-md', headerActions }: DialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<Element | null>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            previousFocusRef.current = document.activeElement;
            document.addEventListener('keydown', handleEscape);

            // Mover foco para o primeiro elemento focável dentro do dialog
            requestAnimationFrame(() => {
                if (!dialogRef.current) return;
                const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
                focusable[0]?.focus();
            });
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
            // Restaurar foco ao elemento que abriu o dialog
            if (isOpen && previousFocusRef.current instanceof HTMLElement) {
                previousFocusRef.current.focus();
            }
        };
    }, [isOpen, onClose]);

    // Focus trap: Tab e Shift+Tab cicla dentro do dialog
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;

        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
            <div
                ref={overlayRef}
                className="absolute inset-0"
                onClick={onClose}
            />
            <div
                ref={dialogRef}
                className={`relative w-full ${maxWidth} bg-surface-card rounded-card shadow-modal flex flex-col max-h-[90vh] popup-spring`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface-2/60 rounded-t-[var(--radius-card)] shrink-0">
                    <h2 id="dialog-title" className="text-lg font-bold text-primary flex-1 min-w-0">{title}</h2>
                    <div className="flex items-center gap-1 shrink-0">
                        {headerActions}
                        <button
                            onClick={onClose}
                            className="p-1 text-muted hover:text-primary hover:bg-surface-0 rounded-[var(--radius-md)] transition-colors"
                            aria-label="Fechar"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
