import React, { useState, useRef, useEffect } from 'react';
import {
    format,
    addDays,
    addWeeks,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    isSameDay,
    parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
    value?: string | null;
    onChange: (value: string | null) => void;
    label?: string;
    placeholder?: string;
    error?: string;
    className?: string;
    disabled?: boolean;
}

const WEEK_DAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

const SHORTCUTS = [
    { label: 'Hoje', getDate: () => new Date() },
    { label: 'Amanhã', getDate: () => addDays(new Date(), 1) },
    { label: 'Prox. semana', getDate: () => addWeeks(new Date(), 1) },
    { label: 'Prox. mês', getDate: () => addMonths(new Date(), 1) },
];

export function DatePicker({
    value,
    onChange,
    label,
    placeholder = 'Selecionar data',
    error,
    className,
    disabled,
}: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState<Date>(() =>
        value ? parseISO(value) : new Date()
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) setViewDate(parseISO(value));
    }, [value]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const selectedDate = value ? parseISO(value) : null;

    const days = eachDayOfInterval({
        start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 }),
    });

    const select = (d: Date) => {
        onChange(format(d, 'yyyy-MM-dd'));
        setOpen(false);
    };

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    const displayValue = selectedDate
        ? format(selectedDate, "d 'de' MMMM',' yyyy", { locale: ptBR })
        : null;

    return (
        <div className={cn('relative w-full', className)} ref={containerRef}>
            {label && (
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-1">
                    {label}
                </label>
            )}

            {/* Trigger */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                className={cn(
                    'flex h-10 w-full items-center gap-2 rounded-[var(--radius-md)] border bg-surface-card px-3 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    error ? 'border-red-500' : 'border-border-subtle',
                    open && !error && 'ring-2 ring-brand/20 border-brand/40',
                )}
            >
                <Calendar
                    size={15}
                    className={cn('shrink-0 transition-colors', selectedDate ? 'text-brand' : 'text-muted')}
                />
                <span className={cn('flex-1 text-left capitalize', selectedDate ? 'text-primary' : 'text-muted')}>
                    {displayValue || placeholder}
                </span>
                {selectedDate && !disabled && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={clear}
                        onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onChange(null))}
                        className="text-muted hover:text-primary transition-colors p-0.5 rounded"
                        aria-label="Limpar data"
                    >
                        <X size={13} />
                    </span>
                )}
            </button>

            {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}

            {/* Popover */}
            {open && (
                <div
                    className={cn(
                        'absolute z-50 top-[calc(100%+6px)] left-0 right-0 min-w-[240px]',
                        'bg-surface-card rounded-[var(--radius-card)] shadow-float border border-border-subtle',
                        'overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100',
                    )}
                >
                    {/* Shortcuts */}
                    <div className="flex gap-1 p-2 border-b border-border-subtle">
                        {SHORTCUTS.map(s => (
                            <button
                                key={s.label}
                                type="button"
                                onClick={() => select(s.getDate())}
                                className={cn(
                                    'flex-1 text-[10px] font-bold px-1 py-1.5 rounded-[var(--radius-sm)] transition-colors',
                                    'text-secondary bg-surface-0 hover:bg-brand hover:text-white',
                                )}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center justify-between px-3 py-2">
                        <button
                            type="button"
                            onClick={() => setViewDate(d => subMonths(d, 1))}
                            className="p-1 rounded-[var(--radius-sm)] text-muted hover:bg-surface-0 hover:text-primary transition-colors"
                            aria-label="Mês anterior"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-primary capitalize select-none">
                            {format(viewDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewDate(d => addMonths(d, 1))}
                            className="p-1 rounded-[var(--radius-sm)] text-muted hover:bg-surface-0 hover:text-primary transition-colors"
                            aria-label="Próximo mês"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 px-2 mb-0.5">
                        {WEEK_DAYS.map((d, i) => (
                            <div key={i} className="text-center text-[10px] font-bold text-muted py-1 select-none">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar days */}
                    <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
                        {days.map(day => {
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isCurrent = isToday(day);
                            const isInMonth = isSameMonth(day, viewDate);

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => select(day)}
                                    className={cn(
                                        'h-8 w-full text-xs rounded-[var(--radius-sm)] transition-colors font-medium',
                                        isSelected
                                            ? 'bg-brand text-white font-bold shadow-sm'
                                            : isCurrent
                                                ? 'bg-brand-light text-brand font-bold'
                                                : isInMonth
                                                    ? 'text-primary hover:bg-surface-0'
                                                    : 'text-muted/50 hover:bg-surface-0',
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
