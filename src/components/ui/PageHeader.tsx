import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: ReactNode;
    description?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex items-center justify-between shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-primary leading-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted mt-0.5">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">{actions}</div>
            )}
        </div>
    );
}
