import Blockquote from '@tiptap/extension-blockquote';
import { mergeAttributes } from '@tiptap/core';

export type BlockquoteColor = 'red' | 'blue' | 'green' | 'amber' | 'purple' | 'gray';

export const BLOCKQUOTE_COLORS: Record<BlockquoteColor, { border: string; bg: string; label: string }> = {
    red:    { border: '#ef4444', bg: '#fef2f2', label: 'Vermelho' },
    blue:   { border: '#3b82f6', bg: '#eff6ff', label: 'Azul' },
    green:  { border: '#22c55e', bg: '#f0fdf4', label: 'Verde' },
    amber:  { border: '#f59e0b', bg: '#fffbeb', label: 'Âmbar' },
    purple: { border: '#8b5cf6', bg: '#f5f3ff', label: 'Roxo' },
    gray:   { border: '#6b7280', bg: '#f9fafb', label: 'Cinza' },
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        coloredBlockquote: {
            setBlockquoteColor: (color: BlockquoteColor) => ReturnType;
        };
    }
}

export const ColoredBlockquote = Blockquote.extend({
    addAttributes() {
        return {
            color: {
                default: 'red' as BlockquoteColor,
                parseHTML: el => (el.getAttribute('data-color') as BlockquoteColor) || 'red',
                renderHTML: attrs => ({ 'data-color': attrs.color }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'blockquote' }];
    },

    renderHTML({ HTMLAttributes }) {
        const color = (HTMLAttributes['data-color'] as BlockquoteColor) || 'red';
        const { border, bg } = BLOCKQUOTE_COLORS[color] ?? BLOCKQUOTE_COLORS.red;
        return [
            'blockquote',
            mergeAttributes(HTMLAttributes, {
                style: `border-left-color: ${border}; background-color: ${bg};`,
            }),
            0,
        ];
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setBlockquoteColor: (color: BlockquoteColor) => ({ commands }) => {
                return commands.updateAttributes('blockquote', { color });
            },
        };
    },
});
