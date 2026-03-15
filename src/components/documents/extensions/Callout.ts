import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success' | 'error' | 'note';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        callout: {
            insertCallout: (type?: CalloutType) => ReturnType;
        };
    }
}

export const Callout = Node.create({
    name: 'callout',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            type: {
                default: 'info' as CalloutType,
                parseHTML: el => (el.getAttribute('data-type') as CalloutType) || 'info',
                renderHTML: attrs => ({ 'data-type': attrs.type }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-callout]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
    },

    addCommands() {
        return {
            insertCallout: (type: CalloutType = 'info') => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { type },
                    content: [{ type: 'paragraph' }],
                });
            },
        };
    },
});
