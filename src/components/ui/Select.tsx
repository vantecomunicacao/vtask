import * as React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    label: React.ReactNode;
    value: string | number;
    icon?: React.ReactNode;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
    label?: string;
    error?: string;
    containerClassName?: string;
    value?: string | number;
    options?: SelectOption[];
    onChange?: (e: { target: { value: string } }) => void;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
    ({ className, label, error, containerClassName, children, value, options, onChange, ...props }, ref) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const [internalOptions, setInternalOptions] = React.useState<SelectOption[]>([]);
        const containerRef = React.useRef<HTMLDivElement>(null);

        // Parse children to options if options array is not provided (Backwards Compatibility)
        React.useEffect(() => {
            if (options) {
                setInternalOptions(options);
            } else if (children) {
                const parsedOptions: SelectOption[] = [];
                React.Children.forEach(children, (child) => {
                    if (React.isValidElement(child) && child.type === 'option') {
                        const optionElement = child as React.ReactElement<{ value?: string | number; children?: React.ReactNode }>;
                        parsedOptions.push({
                            label: optionElement.props.children,
                            value: optionElement.props.value !== undefined ? optionElement.props.value : String(optionElement.props.children),
                        });
                    }
                });
                setInternalOptions(parsedOptions);
            }
        }, [options, children]);

        // Clicar fora para fechar
        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const selectedOption = internalOptions.find(opt => String(opt.value) === String(value));

        const handleSelect = (val: string | number) => {
            if (onChange) {
                onChange({ target: { value: String(val) } });
            }
            setIsOpen(false);
        };

        return (
            <div className={cn('space-y-1 relative', containerClassName)} ref={containerRef}>
                {label && (
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {label}
                    </label>
                )}
                <div 
                    ref={ref}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2 bg-white border border-border-subtle rounded-lg text-sm transition-all cursor-pointer outline-none select-none',
                        isOpen ? 'ring-2 ring-brand/20 border-brand shadow-sm' : 'hover:border-gray-300',
                        error && 'border-red-500 ring-red-500/10 focus:border-red-500',
                        props.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
                        className
                    )}
                    onClick={() => !props.disabled && setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.icon}
                        <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
                            {selectedOption ? selectedOption.label : 'Selecione...'}
                        </span>
                    </div>
                    <ChevronDown size={14} className={cn('text-gray-400 transition-transform duration-200', isOpen && 'rotate-180')} />
                </div>
                
                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-border-subtle rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-60 overflow-y-auto py-1">
                            {internalOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 italic">Nenhuma opção</div>
                            ) : (
                                internalOptions.map((opt, idx) => {
                                    const isSelected = String(opt.value) === String(value);
                                    return (
                                        <div
                                            key={idx}
                                            className={cn(
                                                'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                                                isSelected ? 'bg-brand/5 text-brand font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                            )}
                                            onClick={() => handleSelect(opt.value)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {opt.icon}
                                                <span>{opt.label}</span>
                                            </div>
                                            {isSelected && <Check size={14} className="text-brand shrink-0" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
                
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
