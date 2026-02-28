import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        return (
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                ref={ref}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    checked ? 'bg-brand' : 'bg-gray-200',
                    className
                )}
                {...props}
            >
                <span
                    className={cn(
                        'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                        checked ? 'translate-x-5' : 'translate-x-0'
                    )}
                />
            </button>
        );
    }
);
Toggle.displayName = 'Toggle';
