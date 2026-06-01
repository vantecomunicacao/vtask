import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

const bgColorAttributes = {
    backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes: Record<string, unknown>) => {
            if (!attributes.backgroundColor) return {};
            return { style: `background-color: ${attributes.backgroundColor}` };
        },
    },
};

export const TableCellWithBackground = TableCell.extend({
    addAttributes() {
        return { ...this.parent?.(), ...bgColorAttributes };
    },
});

export const TableHeaderWithBackground = TableHeader.extend({
    addAttributes() {
        return { ...this.parent?.(), ...bgColorAttributes };
    },
});
