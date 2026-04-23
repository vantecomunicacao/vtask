import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    loading?: boolean;
}

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: EmptyStateAction;
    /** 'default' = ícone em box com padding vertical | 'bordered' = borda tracejada preenchendo o container */
    variant?: 'default' | 'bordered';
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    variant = 'default',
    className,
}: EmptyStateProps) {
    const inner = (
        <>
            <div className="w-14 h-14 rounded-card bg-surface-0 flex items-center justify-center shrink-0">
                <Icon size={24} className="text-muted" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-sm font-semibold text-secondary">{title}</p>
                {description && (
                    <p className="text-xs text-muted max-w-xs leading-relaxed">{description}</p>
                )}
            </div>
            {action && (
                <Button onClick={action.onClick} isLoading={action.loading}>
                    {action.label}
                </Button>
            )}
        </>
    );

    if (variant === 'bordered') {
        return (
            <div className={cn(
                'flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border-subtle rounded-card bg-surface-card/50 p-10',
                className,
            )}>
                {inner}
            </div>
        );
    }

    return (
        <div className={cn(
            'py-12 flex flex-col items-center justify-center gap-3 fade-in',
            className,
        )}>
            {inner}
        </div>
    );
}
