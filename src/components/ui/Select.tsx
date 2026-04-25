import * as React from 'react';
import { createPortal } from 'react-dom';
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
        const [focusedIndex, setFocusedIndex] = React.useState(-1);
        const [internalOptions, setInternalOptions] = React.useState<SelectOption[]>([]);
        const [popoverPos, setPopoverPos] = React.useState({ top: 0, left: 0, width: 0 });
        const containerRef = React.useRef<HTMLDivElement>(null);
        const triggerRef = React.useRef<HTMLDivElement>(null);
        const listboxRef = React.useRef<HTMLDivElement>(null);
        const listboxId = React.useId();
        const labelId = React.useId();

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

        React.useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as Node;
                if (
                    listboxRef.current && !listboxRef.current.contains(target) &&
                    containerRef.current && !containerRef.current.contains(target)
                ) {
                    setIsOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);

        const selectedOption = internalOptions.find(opt => String(opt.value) === String(value));

        const handleOpen = () => {
            if (props.disabled) return;
            if (isOpen) { setIsOpen(false); return; }

            if (triggerRef.current) {
                const r = triggerRef.current.getBoundingClientRect();
                const spaceBelow = window.innerHeight - r.bottom;
                const LISTBOX_MAX_H = 260;
                const top = spaceBelow < LISTBOX_MAX_H && r.top > LISTBOX_MAX_H
                    ? r.top - LISTBOX_MAX_H - 4
                    : r.bottom + 4;
                setPopoverPos({ top, left: r.left, width: r.width });
            }

            const selectedIdx = internalOptions.findIndex(opt => String(opt.value) === String(value));
            setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
            setIsOpen(true);
        };

        const handleSelect = (val: string | number) => {
            if (onChange) onChange({ target: { value: String(val) } });
            setIsOpen(false);
            setFocusedIndex(-1);
        };

        const handleKeyDown = (e: React.KeyboardEvent) => {
            if (props.disabled) return;
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (isOpen && focusedIndex >= 0) handleSelect(internalOptions[focusedIndex].value);
                    else handleOpen();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!isOpen) handleOpen();
                    else setFocusedIndex(prev => Math.min(prev + 1, internalOptions.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!isOpen) handleOpen();
                    else setFocusedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    break;
                case 'Tab':
                    setIsOpen(false);
                    break;
            }
        };

        return (
            <div className={cn('space-y-1', containerClassName)} ref={containerRef}>
                {label && (
                    <label id={labelId} className="block text-xs font-bold text-secondary uppercase tracking-widest">
                        {label}
                    </label>
                )}
                <div
                    ref={(node) => {
                        (triggerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                        if (typeof ref === 'function') ref(node);
                        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    }}
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-labelledby={label ? labelId : undefined}
                    aria-controls={isOpen ? listboxId : undefined}
                    aria-activedescendant={isOpen && focusedIndex >= 0 ? `${listboxId}-opt-${focusedIndex}` : undefined}
                    tabIndex={props.disabled ? -1 : 0}
                    className={cn(
                        'w-full flex items-center justify-between px-3 py-2 bg-surface-card border border-border-subtle rounded-[var(--radius-md)] text-sm transition-all cursor-pointer outline-none select-none',
                        isOpen ? 'ring-2 ring-brand/20 border-brand' : 'hover:border-border-subtle',
                        error && 'border-brand ring-brand/10',
                        props.disabled && 'opacity-50 cursor-not-allowed bg-surface-2',
                        className
                    )}
                    onClick={handleOpen}
                    onKeyDown={handleKeyDown}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedOption?.icon}
                        <span className={selectedOption ? 'text-primary' : 'text-muted'}>
                            {selectedOption ? selectedOption.label : 'Selecione...'}
                        </span>
                    </div>
                    <ChevronDown size={14} className={cn('text-muted transition-transform duration-200 shrink-0', isOpen && 'rotate-180')} />
                </div>

                {isOpen && createPortal(
                    <div
                        ref={listboxRef}
                        id={listboxId}
                        role="listbox"
                        aria-label={typeof label === 'string' ? label : undefined}
                        style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, width: popoverPos.width, zIndex: 9999 }}
                        className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                        <div className="max-h-60 overflow-y-auto py-1">
                            {internalOptions.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-secondary italic">Nenhuma opção</div>
                            ) : (
                                internalOptions.map((opt, idx) => {
                                    const isSelected = String(opt.value) === String(value);
                                    const isFocused = idx === focusedIndex;
                                    return (
                                        <div
                                            key={idx}
                                            id={`${listboxId}-opt-${idx}`}
                                            role="option"
                                            aria-selected={isSelected}
                                            className={cn(
                                                'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                                                isSelected ? 'bg-brand/5 text-brand font-medium' : 'text-secondary hover:bg-surface-2 hover:text-primary',
                                                isFocused && !isSelected && 'bg-surface-0 text-primary'
                                            )}
                                            onClick={() => handleSelect(opt.value)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
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
                    </div>,
                    document.body
                )}

                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
