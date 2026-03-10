import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import {
    Heading1, Heading2, List, ListOrdered, CheckSquare,
    Table, Image, Code, Quote, Type, Minus
} from 'lucide-react';

export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: any) => {
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

export const suggestionItems = [
    {
        title: 'Título 1',
        description: 'Título de seção grande.',
        searchTerms: ['titulo', 'h1', 'head', '1'],
        icon: Heading1,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
        },
    },
    {
        title: 'Título 2',
        description: 'Título de seção média.',
        searchTerms: ['titulo', 'h2', 'head', '2'],
        icon: Heading2,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
        },
    },
    {
        title: 'Texto',
        description: 'Começar a escrever com texto simples.',
        searchTerms: ['p', 'paragraph', 'texto', 'normal'],
        icon: Type,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setNode('paragraph').run();
        },
    },
    {
        title: 'Lista de Tarefas',
        description: 'Rastreie tarefas com uma checklist.',
        searchTerms: ['todo', 'task', 'list', 'check', 'tarefa'],
        icon: CheckSquare,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Lista com Marcadores',
        description: 'Crie uma lista simples com marcadores.',
        searchTerms: ['unordered', 'point', 'lista', 'marcadores'],
        icon: List,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Lista Numerada',
        description: 'Crie uma lista com numeração.',
        searchTerms: ['ordered', 'number', 'lista', 'numerada'],
        icon: ListOrdered,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'Citação',
        description: 'Capture uma citação.',
        searchTerms: ['blockquote', 'citação', 'quote'],
        icon: Quote,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Código',
        description: 'Crie um bloco de código.',
        searchTerms: ['codeblock', 'código', 'programming'],
        icon: Code,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },
    {
        title: 'Tabela',
        description: 'Insira uma tabela 3x3.',
        searchTerms: ['table', 'tabela', 'grid'],
        icon: Table,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    {
        title: 'Imagem',
        description: 'Faça upload de uma imagem.',
        searchTerms: ['image', 'imagem', 'upload', 'foto'],
        icon: Image,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).run();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const event = new CustomEvent('editor-upload-image', { detail: { file } });
                    window.dispatchEvent(event);
                }
            };
            input.click();
        },
    },
    {
        title: 'Divisor',
        description: 'Adicionar uma linha horizontal.',
        searchTerms: ['divisor', 'linha', 'div', 'hr', 'horizontal', 'rule', 'separador'],
        icon: Minus,
        command: ({ editor, range }: any) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
];

export const renderItems = () => {
    return {
        onStart: (props: any) => {
            props.renderer = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
            });

            props.popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: props.renderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
            });
        },
        onUpdate(props: any) {
            props.renderer.updateProps(props);

            props.popup[0].setProps({
                getReferenceClientRect: props.clientRect,
            });
        },
        onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
                props.popup[0].hide();
                return true;
            }
            return props.renderer.ref?.onKeyDown(props);
        },
        onExit(props: any) {
            props.popup[0].destroy();
            props.renderer.destroy();
        },
    };
};

const CommandList = forwardRef((props: any, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
        }
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: any) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
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
        <div className="bg-white rounded-lg shadow-xl border border-border-subtle overflow-hidden w-72 animate-in fade-in zoom-in-95 duration-100 z-[100]">
            <div className="p-2 overflow-y-auto max-h-[320px] custom-scrollbar">
                {props.items.length > 0 ? (
                    props.items.map((item: any, index: number) => (
                        <button
                            key={index}
                            onClick={() => selectItem(index)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-md transition-colors ${index === selectedIndex ? 'bg-brand/10 text-brand' : 'hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded border border-border-subtle flex items-center justify-center shrink-0 ${index === selectedIndex ? 'bg-white border-brand/20' : 'bg-gray-50'
                                }`}>
                                <item.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-bold truncate">{item.title}</div>
                                <div className="text-[10px] text-gray-400 truncate uppercase tracking-wider">{item.description}</div>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="p-3 text-sm text-gray-500 text-center italic">Nenhum comando encontrado</div>
                )}
            </div>
        </div>
    );
});

CommandList.displayName = 'CommandList';
