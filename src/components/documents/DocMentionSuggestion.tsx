import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { FileText } from 'lucide-react';
import type { Document } from '../../store/documentStore';

interface DocListHandle {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const DocList = forwardRef<DocListHandle, SuggestionProps<Document>>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const items: Document[] = props.items;

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) props.command({ id: item.id, label: item.title || 'Sem título' });
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + items.length - 1) % items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    useEffect(() => setSelectedIndex(0), [props.items]);

    return (
        <div className="bg-surface-card rounded-[var(--radius-card)] shadow-float border border-border-subtle overflow-hidden w-72 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-brand/60">
                Documentos
            </div>
            <div className="overflow-y-auto max-h-[280px] custom-scrollbar p-1.5 pt-0">
                {items.length === 0 ? (
                    <div className="p-4 text-sm text-muted text-center">Nenhum documento encontrado</div>
                ) : (
                    items.map((item, index) => (
                        <button
                            key={item.id}
                            onMouseDown={e => { e.preventDefault(); selectItem(index); }}
                            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] text-left transition-colors ${index === selectedIndex ? 'bg-brand/10 text-brand' : 'hover:bg-surface-0 text-primary'}`}
                        >
                            <div className={`w-7 h-7 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0 ${index === selectedIndex ? 'bg-brand-light border-brand/20 text-brand' : 'bg-surface-0 border-border-subtle text-muted'}`}>
                                <FileText size={14} />
                            </div>
                            <span className="text-sm font-medium truncate">
                                {item.title || 'Sem título'}
                            </span>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
});

DocList.displayName = 'DocList';

export const renderDocItems = () => {
    let renderer: ReactRenderer<DocListHandle, SuggestionProps<Document>> | null = null;
    let popup: ReturnType<typeof tippy>[0] | null = null;

    return {
        onStart: (props: SuggestionProps<Document>) => {
            renderer = new ReactRenderer<DocListHandle, SuggestionProps<Document>>(DocList, {
                props,
                editor: props.editor,
            });
            const instances = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            });
            popup = instances[0];
        },
        onUpdate(props: SuggestionProps<Document>) {
            renderer?.updateProps(props);
            popup?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
        },
        onKeyDown(props: SuggestionKeyDownProps) {
            if (props.event.key === 'Escape') { popup?.hide(); return true; }
            return renderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
            popup?.destroy();
            renderer?.destroy();
            popup = null;
            renderer = null;
        },
    };
};
