import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import {
    Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
    Table, Image, Code, Quote, Type, Minus,
    Info, AlertTriangle, CheckCircle, AlertCircle, StickyNote,
    ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface SlashCommandItem {
    title: string;
    description: string;
    searchTerms: string[];
    icon: LucideIcon;
    category: string;
    command: (props: { editor: Editor; range: Range }) => void;
}

interface CommandListHandle {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

// ─── Extension ────────────────────────────────────────────────────
export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});

// ─── Items com categoria ──────────────────────────────────────────
export const suggestionItems: SlashCommandItem[] = [
    // Texto
    {
        title: 'Texto',
        description: 'Parágrafo simples.',
        searchTerms: ['p', 'paragraph', 'texto', 'normal'],
        icon: Type,
        category: 'Texto',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('paragraph').run();
        },
    },
    {
        title: 'Título 1',
        description: 'Título de seção grande.',
        searchTerms: ['titulo', 'h1', 'head', '1'],
        icon: Heading1,
        category: 'Texto',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
    },
    {
        title: 'Título 2',
        description: 'Título de seção média.',
        searchTerms: ['titulo', 'h2', 'head', '2'],
        icon: Heading2,
        category: 'Texto',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
    },
    {
        title: 'Título 3',
        description: 'Título de seção pequena.',
        searchTerms: ['titulo', 'h3', 'head', '3'],
        icon: Heading3,
        category: 'Texto',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
        },
    },
    {
        title: 'Citação',
        description: 'Capture uma citação.',
        searchTerms: ['blockquote', 'citacao', 'quote'],
        icon: Quote,
        category: 'Texto',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    // Listas
    {
        title: 'Lista de Tarefas',
        description: 'Checklist com checkbox.',
        searchTerms: ['todo', 'task', 'list', 'check', 'tarefa'],
        icon: CheckSquare,
        category: 'Listas',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Lista com Marcadores',
        description: 'Lista simples com bullets.',
        searchTerms: ['unordered', 'point', 'lista', 'marcadores'],
        icon: List,
        category: 'Listas',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Lista Numerada',
        description: 'Lista com numeração.',
        searchTerms: ['ordered', 'number', 'lista', 'numerada'],
        icon: ListOrdered,
        category: 'Listas',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    // Blocos
    {
        title: 'Toggle',
        description: 'Seção expansível/colapsável.',
        searchTerms: ['toggle', 'details', 'collapsible', 'expandir', 'colapsar', 'dobrar'],
        icon: ChevronRight,
        category: 'Blocos',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertDetails().run();
        },
    },
    {
        title: 'Código',
        description: 'Bloco de código com syntax highlight.',
        searchTerms: ['codeblock', 'codigo', 'programming'],
        icon: Code,
        category: 'Blocos',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
    {
        title: 'Tabela',
        description: 'Tabela 3×3.',
        searchTerms: ['table', 'tabela', 'grid'],
        icon: Table,
        category: 'Blocos',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    {
        title: 'Imagem',
        description: 'Upload de imagem.',
        searchTerms: ['image', 'imagem', 'upload', 'foto'],
        icon: Image,
        category: 'Blocos',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) window.dispatchEvent(new CustomEvent('editor-upload-image', { detail: { file } }));
            };
            input.click();
        },
    },
    {
        title: 'Divisor',
        description: 'Linha horizontal separadora.',
        searchTerms: ['divisor', 'linha', 'hr', 'horizontal', 'separador'],
        icon: Minus,
        category: 'Blocos',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    // Callouts
    {
        title: 'Info',
        description: 'Bloco de informação.',
        searchTerms: ['callout', 'info', 'bloco', 'azul'],
        icon: Info,
        category: 'Callout',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertCallout('info').run();
        },
    },
    {
        title: 'Atenção',
        description: 'Bloco de alerta.',
        searchTerms: ['callout', 'warning', 'atencao', 'aviso', 'amarelo', 'alerta'],
        icon: AlertTriangle,
        category: 'Callout',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertCallout('warning').run();
        },
    },
    {
        title: 'Sucesso',
        description: 'Bloco de confirmação.',
        searchTerms: ['callout', 'success', 'sucesso', 'verde', 'ok'],
        icon: CheckCircle,
        category: 'Callout',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertCallout('success').run();
        },
    },
    {
        title: 'Erro',
        description: 'Bloco de erro/perigo.',
        searchTerms: ['callout', 'error', 'erro', 'perigo', 'vermelho'],
        icon: AlertCircle,
        category: 'Callout',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertCallout('error').run();
        },
    },
    {
        title: 'Nota',
        description: 'Bloco de destaque.',
        searchTerms: ['callout', 'note', 'nota', 'roxo', 'destaque'],
        icon: StickyNote,
        category: 'Callout',
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertCallout('note').run();
        },
    },
];

// ─── Render ───────────────────────────────────────────────────────
export const renderItems = () => {
    let renderer: ReactRenderer<CommandListHandle, SuggestionProps<SlashCommandItem>> | null = null;
    let popup: ReturnType<typeof tippy> | null = null;

    return {
        onStart: (props: SuggestionProps<SlashCommandItem>) => {
            renderer = new ReactRenderer<CommandListHandle, SuggestionProps<SlashCommandItem>>(
                CommandList,
                { props, editor: props.editor }
            );
            popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            }) as any;
        },
        onUpdate(props: SuggestionProps<SlashCommandItem>) {
            renderer?.updateProps(props);
            (popup as any)?.setProps({ getReferenceClientRect: props.clientRect as any });
        },
        onKeyDown(props: SuggestionKeyDownProps) {
            if (props.event.key === 'Escape') { (popup as any)?.hide(); return true; }
            return renderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit() {
            (popup as any)?.destroy();
            renderer?.destroy();
            popup = null;
            renderer = null;
        },
    };
};

// ─── Command List ─────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    'Texto': 'text-blue-500',
    'Listas': 'text-green-500',
    'Blocos': 'text-purple-500',
    'Callout': 'text-orange-500',
};

const CommandList = forwardRef<CommandListHandle, SuggestionProps<SlashCommandItem>>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const items: SlashCommandItem[] = props.items;

    const selectItem = (index: number) => {
        const item = items[index];
        if (item) props.command(item);
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: SuggestionKeyDownProps) => {
            if (event.key === 'ArrowUp') { setSelectedIndex((selectedIndex + items.length - 1) % items.length); return true; }
            if (event.key === 'ArrowDown') { setSelectedIndex((selectedIndex + 1) % items.length); return true; }
            if (event.key === 'Enter') { selectItem(selectedIndex); return true; }
            return false;
        },
    }));

    useEffect(() => setSelectedIndex(0), [props.items]);

    const isFiltering = props.query.trim().length > 0;
    const grouped: Record<string, SlashCommandItem[]> = {};
    items.forEach(item => {
        const cat = item.category || 'Outros';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    let flatIndex = 0;

    return (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden w-72 animate-in fade-in zoom-in-95 duration-100">
            <div className="overflow-y-auto max-h-[380px] custom-scrollbar p-1.5">
                {items.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">Nenhum comando encontrado</div>
                ) : isFiltering ? (
                    items.map((item, index) => (
                        <CommandItem
                            key={index}
                            item={item}
                            isSelected={index === selectedIndex}
                            onClick={() => selectItem(index)}
                        />
                    ))
                ) : (
                    Object.entries(grouped).map(([category, catItems]) => (
                        <div key={category}>
                            <div className={`px-3 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest ${CATEGORY_COLORS[category] ?? 'text-gray-400'}`}>
                                {category}
                            </div>
                            {catItems.map((item) => {
                                const idx = flatIndex++;
                                return (
                                    <CommandItem
                                        key={idx}
                                        item={item}
                                        isSelected={idx === selectedIndex}
                                        onClick={() => selectItem(idx)}
                                    />
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

function CommandItem({ item, isSelected, onClick }: { item: SlashCommandItem; isSelected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-brand/10 text-brand' : 'hover:bg-gray-50 text-gray-700'}`}
        >
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${isSelected ? 'bg-white border-brand/20 text-brand' : 'bg-gray-50 border-gray-100 text-gray-500'}`}>
                <item.icon size={14} />
            </div>
            <div className="min-w-0">
                <div className="text-sm font-semibold truncate leading-tight">{item.title}</div>
                <div className="text-[10px] text-gray-400 truncate leading-tight">{item.description}</div>
            </div>
        </button>
    );
}

CommandList.displayName = 'CommandList';
