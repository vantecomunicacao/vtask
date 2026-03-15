import * as React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'admin' | 'editor' | 'viewer';
}

export function Badge({ className, variant = 'viewer', ...props }: BadgeProps) {
    const variants = {
        admin: 'bg-red-100 text-brand border-red-200',
        editor: 'bg-green-100 text-green-700 border-green-200',
        viewer: 'bg-surface-0 text-secondary border-border-subtle',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-[var(--radius-sm)] border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
