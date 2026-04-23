import { describe, it, expect } from 'vitest';
import { typography, modalSizes, CHART_PALETTE } from '../lib/designTokens';

describe('typography', () => {
    it('has all semantic keys', () => {
        const keys = ['pageTitle', 'sectionTitle', 'cardTitle', 'body', 'label', 'micro'] as const;
        keys.forEach(k => expect(typography).toHaveProperty(k));
    });

    it('pageTitle contains font-bold', () => {
        expect(typography.pageTitle).toContain('font-bold');
    });

    it('label contains uppercase', () => {
        expect(typography.label).toContain('uppercase');
    });

    it('all values are non-empty strings', () => {
        Object.values(typography).forEach(v => {
            expect(typeof v).toBe('string');
            expect(v.length).toBeGreaterThan(0);
        });
    });
});

describe('modalSizes', () => {
    it('has sm, md, lg, xl, full', () => {
        (['sm', 'md', 'lg', 'xl', 'full'] as const).forEach(k => {
            expect(modalSizes).toHaveProperty(k);
        });
    });

    it('each value is a max-w-* Tailwind class', () => {
        Object.values(modalSizes).forEach(v => {
            expect(v).toMatch(/^max-w-/);
        });
    });

    it('sizes are ordered smallest to largest (by class name string)', () => {
        const order = ['max-w-md', 'max-w-lg', 'max-w-2xl', 'max-w-4xl', 'max-w-5xl'];
        expect(Object.values(modalSizes)).toEqual(order);
    });
});

describe('CHART_PALETTE', () => {
    it('has at least 8 colors', () => {
        expect(CHART_PALETTE.length).toBeGreaterThanOrEqual(8);
    });

    it('all entries are hex color strings', () => {
        CHART_PALETTE.forEach(color => {
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    it('has no duplicates', () => {
        const unique = new Set(CHART_PALETTE);
        expect(unique.size).toBe(CHART_PALETTE.length);
    });
});
