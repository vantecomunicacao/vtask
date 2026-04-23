import { format, isToday as dateFnsIsToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Parse a due_date string as LOCAL midnight, ignoring any timezone offset.
 *
 * Supabase stores due_date as TIMESTAMP WITH TIME ZONE (UTC midnight).
 * Reading it directly in UTC-3 shifts it to the previous day.
 * Fix: take only the date part and append T00:00:00 for local midnight.
 */
export function parseDueDate(d: string): Date {
    return new Date(d.substring(0, 10) + 'T00:00:00');
}

/**
 * Returns today's date as 'yyyy-MM-dd' in LOCAL time.
 * `new Date().toISOString()` returns UTC and can be off-by-one in UTC−3 (Brazil).
 */
export function todayLocalISO(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

export interface DueDateDisplay {
    label: string;
    className: string;
}

/**
 * Returns a human-readable label and Tailwind color class for a due date string.
 * Centralizes the display logic that was previously duplicated in TaskRow and Dashboard.
 */
export function formatDueDate(due: string): DueDateDisplay {
    const date = parseDueDate(due);
    if (dateFnsIsToday(date))  return { label: 'Hoje',   className: 'text-amber-600 font-semibold' };
    if (isTomorrow(date))      return { label: 'Amanhã', className: 'text-orange-500' };
    if (isPast(date))          return { label: format(date, 'dd/MM', { locale: ptBR }), className: 'text-red-600 font-bold underline' };
    return                            { label: format(date, 'dd/MM', { locale: ptBR }), className: 'text-secondary' };
}

export function isOverdue(due: string): boolean {
    const date = parseDueDate(due);
    return isPast(date) && !dateFnsIsToday(date);
}

export function isDueToday(due: string): boolean {
    return dateFnsIsToday(parseDueDate(due));
}
