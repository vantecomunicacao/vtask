import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, ...props }, ref) => {
        return (
            <div className="w-full">
                <input
                    className={cn(
                        'flex h-10 w-full rounded-md border border-border-subtle bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50',
                        error && 'border-red-500 focus-visible:ring-red-200',
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
            </div>
        );
    }
);
Input.displayName = 'Input';
