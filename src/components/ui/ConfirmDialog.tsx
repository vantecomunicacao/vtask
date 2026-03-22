import { AlertTriangle } from 'lucide-react';
import { Dialog } from './Dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: 'danger' | 'default';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirmar',
    variant = 'default',
}: ConfirmDialogProps) {
    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={
            <span className="flex items-center gap-2">
                {variant === 'danger' && <AlertTriangle size={18} className="text-red-500 shrink-0" />}
                {title}
            </span>
        }>
            <div className="flex flex-col gap-6">
                <p className="text-sm text-secondary">{description}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        size="sm"
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
