import { cn } from '../../lib/utils';

interface FormGridProps {
    children: React.ReactNode;
    cols?: 1 | 2 | 3;
    className?: string;
}

/** Grid container para grupos de campos lado a lado. Padrão: 2 colunas. */
export function FormGrid({ children, cols = 2, className }: FormGridProps) {
    return (
        <div className={cn(
            'grid gap-4',
            cols === 1 && 'grid-cols-1',
            cols === 2 && 'grid-cols-2',
            cols === 3 && 'grid-cols-3',
            className,
        )}>
            {children}
        </div>
    );
}

interface FormFieldProps {
    label: string;
    error?: string;
    required?: boolean;
    hint?: string;
    colSpan?: 1 | 2 | 3;
    children: React.ReactNode;
    className?: string;
}

/** Wrapper de campo com label, conteúdo e mensagem de erro padronizados. */
export function FormField({ label, error, required, hint, colSpan, children, className }: FormFieldProps) {
    return (
        <div className={cn(
            'flex flex-col gap-1',
            colSpan === 2 && 'col-span-2',
            colSpan === 3 && 'col-span-3',
            className,
        )}>
            <label className="text-sm font-medium text-secondary">
                {label}
                {required && <span className="text-brand ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted">{hint}</p>
            )}
            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
}

interface FormActionsProps {
    children: React.ReactNode;
    className?: string;
}

/** Row de botões de ação no rodapé do formulário. */
export function FormActions({ children, className }: FormActionsProps) {
    return (
        <div className={cn(
            'pt-4 flex justify-end gap-3 border-t border-border-subtle',
            className,
        )}>
            {children}
        </div>
    );
}
