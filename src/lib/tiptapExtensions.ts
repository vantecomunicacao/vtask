import { Extension, InputRule } from '@tiptap/core';

export const TextSubstitutions = Extension.create({
    name: 'textSubstitutions',
    addInputRules() {
        return [
            new InputRule({
                find: /->$/,
                handler: ({ state, range }) => {
                    const { tr } = state;
                    tr.replaceWith(range.from, range.to, state.schema.text('→'));
                    return tr;
                },
            }),
        ];
    },
});
