import { Extension } from '@tiptap/core';
import { textInputRule } from '@tiptap/core';

export const TextSubstitutions = Extension.create({
    name: 'textSubstitutions',
    addInputRules() {
        return [
            textInputRule({ find: /->$/, replace: '→' }),
        ];
    },
});
