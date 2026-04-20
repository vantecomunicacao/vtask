import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { FileText, ChevronRight } from 'lucide-react';
import type { Document } from '../../store/documentStore';

interface DocListHandle {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface EnrichedDocument extends Document {
    _parentTitle?: string | null;
    _depth?: number;
}

const DocList = forwardRef<DocListHandle, SuggestionProps<EnrichedDocument>>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const items: EnrichedDocument[] = props.items;

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
        <div className="bg-surface-card rounded-[var(--radius-card)] shadow-float border border-border-subtle overflow-hidden w-80 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand/60">Documentos</span>
                {items.length > 0 && (
                    <span className="text-[9px] text-muted">{items.length} página{items.length !== 1 ? 's' : ''}</span>
                )}
            </div>
            <div className="overflow-y-auto max-h-[320px] custom-scrollbar p-1.5 pt-0">
                {items.length === 0 ? (
                    <div className="p-4 text-sm text-muted text-center">Nenhum documento encontrado</div>
                ) : (
                    items.map((item, index) => {
                        const isActive = index === selectedIndex;
                        const isSubpage = !!item._parentTitle;
                        return (
                            <button
                                key={item.id}
                                onMouseDown={e => { e.preventDefault(); selectItem(index); }}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] text-left transition-colors ${isActive ? 'bg-brand/10 text-brand' : 'hover:bg-surface-0 text-primary'}`}
                            >
                                <div className={`w-7 h-7 rounded-[var(--radius-sm)] border flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-light border-brand/20 text-brand' : 'bg-surface-0 border-border-subtle text-muted'}`}>
                                    <FileText size={13} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isSubpage && (
                                        <div className={`flex items-center gap-0.5 text-[10px] mb-0.5 truncate ${isActive ? 'text-brand/60' : 'text-muted'}`}>
                                            <span className="truncate">{item._parentTitle}</span>
                                            <ChevronRight size={9} className="shrink-0" />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium truncate block">
                                        {item.title || 'Sem título'}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
});

DocList.displayName = 'DocList';

export const createRenderDocItems = (_getDoc: (id: string) => Document | undefined) => () => {
    let renderer: ReactRenderer<DocListHandle, SuggestionProps<EnrichedDocument>> | null = null;
    let popup: ReturnType<typeof tippy>[0] | null = null;

    return {
        onStart: (props: SuggestionProps<EnrichedDocument>) => {
            renderer = new ReactRenderer<DocListHandle, SuggestionProps<EnrichedDocument>>(DocList, {
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
        onUpdate(props: SuggestionProps<EnrichedDocument>) {
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

export const renderDocItems = createRenderDocItems(() => undefined);
