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

/**
 * Corrige dois comportamentos de listas:
 *
 * 1. Enter em item de lista vazio E aninhado → dedenta (sobe um nível) em vez de criar
 *    novo item vazio ainda mais aninhado.
 *
 * 2. Tab dentro de qualquer lista (bullet, ordered, task) → sink (indenta).
 *    Shift-Tab → lift (dedenta). Garante que o comportamento funciona mesmo
 *    quando outro handler captura a tecla antes.
 */
export const ListKeyboardFixes = Extension.create({
    name: 'listKeyboardFixes',
    priority: 200, // executa antes das extensões de lista padrão

    addKeyboardShortcuts() {
        return {
            // Enter em item vazio de lista aninhada → sobe nível
            Enter: ({ editor }) => {
                const { selection } = editor.state;
                if (!selection.empty) return false;

                const { $from } = selection;
                const listItemTypes = ['listItem', 'taskItem'];
                const node = $from.node($from.depth);

                // Só age se estiver num listItem/taskItem E o conteúdo for vazio
                if (!listItemTypes.includes(node.type.name)) return false;
                const isEmpty = node.textContent === '';
                if (!isEmpty) return false;

                // Se estiver em nível raiz (depth == 2: doc > list > item), sai da lista normalmente
                const parentList = $from.node($from.depth - 1);
                const grandParent = $from.node($from.depth - 2);
                const grandParentIsList = ['bulletList', 'orderedList', 'taskList'].includes(grandParent?.type?.name ?? '');

                if (!grandParentIsList) return false; // deixa o Enter padrão sair da lista

                // Está num item vazio aninhado → lift (sobe um nível)
                if (node.type.name === 'taskItem') {
                    return editor.commands.liftListItem('taskItem');
                }
                if (parentList.type.name === 'orderedList') {
                    return editor.commands.liftListItem('listItem');
                }
                return editor.commands.liftListItem('listItem');
            },
        };
    },
});
