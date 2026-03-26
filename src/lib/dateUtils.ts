import { format } from 'date-fns';

/**
 * Parse a due_date string as LOCAL midnight, ignoring any timezone offset.
 *
 * Problem: Supabase stores due_date as TIMESTAMP WITH TIME ZONE.
 * Inserting '2026-03-24' saves as '2026-03-24T00:00:00+00:00' (UTC midnight).
 * `new Date('2026-03-24T00:00:00+00:00')` in UTC-3 = March 23 at 21:00 local.
 * isToday/isPast then return wrong results for the whole day.
 *
 * Fix: always take only the date part (first 10 chars) and append T00:00:00
 * so JS creates a local-midnight Date regardless of the stored timezone.
 *
 * Works with both '2026-03-24' (10 chars) and '2026-03-24T00:00:00+00:00'.
 */
export function parseDueDate(d: string): Date {
    return new Date(d.substring(0, 10) + 'T00:00:00');
}

/**
 * Returns today's date as 'yyyy-MM-dd' in LOCAL time.
 * Unlike `new Date().toISOString().split('T')[0]` which returns UTC date
 * and can be off by one day for timezones behind UTC (e.g. Brazil UTC-3).
 */
export function todayLocalISO(): string {
    return format(new Date(), 'yyyy-MM-dd');
}
