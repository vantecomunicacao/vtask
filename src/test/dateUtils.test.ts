import { describe, it, expect } from 'vitest';
import { parseDueDate, todayLocalISO, formatDueDate, isOverdue, isDueToday } from '../lib/dateUtils';

// Helper: returns a yyyy-MM-dd string offset from today by `days`
function isoOffset(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().substring(0, 10);
}

describe('parseDueDate', () => {
    it('returns a Date at local midnight ignoring timezone offset', () => {
        const date = parseDueDate('2025-06-15T00:00:00.000Z');
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(5); // June = 5
        expect(date.getDate()).toBe(15);
        expect(date.getHours()).toBe(0);
    });

    it('works with date-only strings', () => {
        const date = parseDueDate('2025-01-01');
        expect(date.getFullYear()).toBe(2025);
        expect(date.getMonth()).toBe(0);
        expect(date.getDate()).toBe(1);
    });
});

describe('todayLocalISO', () => {
    it('returns a yyyy-MM-dd string', () => {
        const result = todayLocalISO();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches today in local time', () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        expect(todayLocalISO()).toBe(`${y}-${m}-${d}`);
    });
});

describe('formatDueDate', () => {
    it('returns "Hoje" for today', () => {
        const { label, className } = formatDueDate(isoOffset(0));
        expect(label).toBe('Hoje');
        expect(className).toContain('amber');
    });

    it('returns "Amanhã" for tomorrow', () => {
        const { label } = formatDueDate(isoOffset(1));
        expect(label).toBe('Amanhã');
    });

    it('returns dd/MM for future dates', () => {
        const { label, className } = formatDueDate(isoOffset(7));
        expect(label).toMatch(/^\d{2}\/\d{2}$/);
        expect(className).toContain('secondary');
    });

    it('returns dd/MM with red class for past dates', () => {
        const { label, className } = formatDueDate(isoOffset(-3));
        expect(label).toMatch(/^\d{2}\/\d{2}$/);
        expect(className).toContain('red');
    });
});

describe('isOverdue', () => {
    it('returns true for past dates (not today)', () => {
        expect(isOverdue(isoOffset(-1))).toBe(true);
        expect(isOverdue(isoOffset(-10))).toBe(true);
    });

    it('returns false for today', () => {
        expect(isOverdue(isoOffset(0))).toBe(false);
    });

    it('returns false for future dates', () => {
        expect(isOverdue(isoOffset(1))).toBe(false);
        expect(isOverdue(isoOffset(30))).toBe(false);
    });
});

describe('isDueToday', () => {
    it('returns true for today', () => {
        expect(isDueToday(isoOffset(0))).toBe(true);
    });

    it('returns false for yesterday', () => {
        expect(isDueToday(isoOffset(-1))).toBe(false);
    });

    it('returns false for tomorrow', () => {
        expect(isDueToday(isoOffset(1))).toBe(false);
    });
});
