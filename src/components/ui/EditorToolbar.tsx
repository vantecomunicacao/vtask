import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { BLOCKQUOTE_COLORS, type BlockquoteColor } from '../documents/extensions/ColoredBlockquote';
import {
    Bold, Italic, Strikethrough, Link as LinkIcon,
    Heading1, Heading2, Heading3, List, ListOrdered,
    CheckSquare, Table as TableIcon, Image as ImageIcon, Code,
    AlignLeft, AlignCenter, AlignRight, Minus,
    Undo2, Redo2, Highlighter, Palette, Quote, Eraser,
    SplitSquareHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Constants ────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
    { color: '#FEF08A', label: 'Amarelo' },
    { color: '#BBF7D0', label: 'Verde' },
    { color: '#BAE6FD', label: 'Azul' },
    { color: '#FBCFE8', label: 'Rosa' },
    { color: '#FED7AA', label: 'Laranja' },
    { color: '#DDD6FE', label: 'Roxo' },
    { color: '#FECACA', label: 'Vermelho' },
    { color: '#E5E7EB', label: 'Cinza' },
];

const TEXT_COLORS = [
    { color: '#1c1a18', label: 'Padrão' },
    { color: '#db4035', label: 'Vermelho' },
    { color: '#ff9f1a', label: 'Laranja' },
    { color: '#d9730d', label: 'Marrom' },
    { color: '#0b6e99', label: 'Azul' },
    { color: '#0f7b6c', label: 'Verde' },
    { color: '#6940a5', label: 'Roxo' },
    { color: '#ad1a72', label: 'Rosa' },
    { color: '#64748b', label: 'Cinza' },
];

// ─── Portal ───────────────────────────────────────────────────────

function PickerPortal({ pos, children }: { pos: { top: number; left: number }; children: React.ReactNode }) {
    return createPortal(
        <div data-picker style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
            {children}
        </div>,
        document.body
    );
}

// ─── Picker panels ────────────────────────────────────────────────

export function HighlightSwatches({ editor, onClose }: { editor: Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Destaque</span>
            <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_COLORS.map(({ color, label }) => (
                    <button key={color} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color }).run(); onClose(); }}
                        title={label} className="w-7 h-7 rounded-[var(--radius-sm)] border-2 border-transparent hover:border-brand transition-all hover:scale-110"
                        style={{ backgroundColor: color }} />
                ))}
            </div>
            <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); onClose(); }}
                className="text-[10px] text-muted hover:text-primary transition-colors px-1 text-left mt-0.5">
                Remover destaque
            </button>
        </div>
    );
}

function TextColorSwatches({ editor, onClose }: { editor: Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Cor do texto</span>
            <div className="grid grid-cols-3 gap-1">
                {TEXT_COLORS.map(({ color, label }) => (
                    <button key={color} onMouseDown={e => {
                        e.preventDefault();
                        if (color === '#1c1a18') editor.chain().focus().unsetColor().run();
                        else editor.chain().focus().setColor(color).run();
                        onClose();
                    }} title={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:bg-surface-0 transition-colors">
                        <div className="w-4 h-4 rounded-full border border-border-subtle shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-secondary truncate">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function BlockquotePicker({ editor, onClose }: { editor: Editor; onClose: () => void }) {
    return (
        <div className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2 flex flex-col gap-1.5 min-w-[9rem]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-1">Citação</span>
            <div className="grid grid-cols-3 gap-1">
                {(Object.entries(BLOCKQUOTE_COLORS) as [BlockquoteColor, { border: string; bg: string; label: string }][]).map(([key, { border, bg, label }]) => (
                    <button key={key} onMouseDown={e => {
                        e.preventDefault();
                        if (!editor.isActive('blockquote')) editor.chain().focus().toggleBlockquote().run();
                        editor.chain().focus().setBlockquoteColor(key).run();
                        onClose();
                    }} title={label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] hover:opacity-80 transition-opacity"
                        style={{ borderLeft: `3px solid ${border}`, backgroundColor: bg }}>
                        <span className="text-[10px] font-medium truncate" style={{ color: border }}>{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────

export interface EditorToolbarProps {
    editor: Editor;
    /** Callback chamado quando o usuário seleciona uma imagem pelo botão da toolbar */
    onImageUpload?: (file: File) => void;
    /** 'sm' = ícones 13px (task editors) | 'md' = ícones 17px (doc editor) */
    size?: 'sm' | 'md';
    /** Inclui botão de quebra de página (apenas DocumentEditor) */
    includePageBreak?: boolean;
    className?: string;
}

export function EditorToolbar({
    editor,
    onImageUpload,
    size = 'sm',
    includePageBreak = false,
    className,
}: EditorToolbarProps) {
    const iconSize = size === 'md' ? 17 : 13;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [highlightOpen, setHighlightOpen] = useState(false);
    const [textColorOpen, setTextColorOpen] = useState(false);
    const [blockquoteOpen, setBlockquoteOpen] = useState(false);
    const [highlightPos, setHighlightPos] = useState({ top: 0, left: 0 });
    const [textColorPos, setTextColorPos] = useState({ top: 0, left: 0 });
    const [blockquotePos, setBlockquotePos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-picker]') && !target.closest('[data-picker-btn]')) {
                setHighlightOpen(false);
                setTextColorOpen(false);
                setBlockquoteOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const openPicker = (
        getter: boolean,
        setter: (v: boolean) => void,
        posSetter: (p: { top: number; left: number }) => void,
        btnEl: HTMLElement,
        closeOthers: () => void,
    ) => {
        const r = btnEl.getBoundingClientRect();
        posSetter({ top: r.bottom + 4, left: r.left });
        setter(!getter);
        closeOthers();
    };

    // Estilo dos botões — varia com `size` para manter a identidade visual de cada editor
    const btn = (active?: boolean) => cn(
        'p-1.5 rounded-[var(--radius-sm)] transition-all shrink-0',
        size === 'md'
            ? active
                ? 'text-brand bg-surface-card shadow-[var(--shadow-card)]'
                : 'text-secondary hover:bg-surface-card hover:shadow-[var(--shadow-card)]'
            : active
                ? 'text-brand bg-surface-0'
                : 'text-secondary hover:bg-surface-0'
    );

    const divider = <div className="w-px h-4 bg-border-subtle mx-1 shrink-0" />;

    return (
        <div className={cn('flex items-center gap-0.5 overflow-x-auto', className)}>
            {/* Undo / Redo */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run(); }}
                disabled={!editor.can().undo()} className={cn(btn(), 'disabled:opacity-30')} title="Desfazer">
                <Undo2 size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run(); }}
                disabled={!editor.can().redo()} className={cn(btn(), 'disabled:opacity-30')} title="Refazer">
                <Redo2 size={iconSize} />
            </button>

            {divider}

            {/* Headings */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
                className={btn(editor.isActive('heading', { level: 1 }))} title="Título 1">
                <Heading1 size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
                className={btn(editor.isActive('heading', { level: 2 }))} title="Título 2">
                <Heading2 size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
                className={btn(editor.isActive('heading', { level: 3 }))} title="Título 3">
                <Heading3 size={iconSize} />
            </button>

            {divider}

            {/* Formatting */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
                className={btn(editor.isActive('bold'))} title="Negrito">
                <Bold size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
                className={btn(editor.isActive('italic'))} title="Itálico">
                <Italic size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
                className={btn(editor.isActive('strike'))} title="Tachado">
                <Strikethrough size={iconSize} />
            </button>

            {/* Highlight picker */}
            <button type="button" data-picker-btn onMouseDown={e => {
                e.preventDefault();
                openPicker(highlightOpen, setHighlightOpen, setHighlightPos, e.currentTarget as HTMLElement,
                    () => { setTextColorOpen(false); setBlockquoteOpen(false); });
            }} className={btn(editor.isActive('highlight'))} title="Destaque">
                <Highlighter size={iconSize} />
            </button>

            {/* Text color picker */}
            <button type="button" data-picker-btn onMouseDown={e => {
                e.preventDefault();
                openPicker(textColorOpen, setTextColorOpen, setTextColorPos, e.currentTarget as HTMLElement,
                    () => { setHighlightOpen(false); setBlockquoteOpen(false); });
            }} className={btn(!!editor.getAttributes('textStyle').color)} title="Cor do texto">
                <Palette size={iconSize} />
            </button>

            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetAllMarks().run(); }}
                className={btn()} title="Limpar formatação">
                <Eraser size={iconSize} />
            </button>

            {divider}

            {/* Lists */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
                className={btn(editor.isActive('bulletList'))} title="Lista">
                <List size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
                className={btn(editor.isActive('orderedList'))} title="Lista numerada">
                <ListOrdered size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }}
                className={btn(editor.isActive('taskList'))} title="Lista de tarefas">
                <CheckSquare size={iconSize} />
            </button>

            {/* Blockquote picker */}
            <button type="button" data-picker-btn onMouseDown={e => {
                e.preventDefault();
                openPicker(blockquoteOpen, setBlockquoteOpen, setBlockquotePos, e.currentTarget as HTMLElement,
                    () => { setHighlightOpen(false); setTextColorOpen(false); });
            }} className={btn(editor.isActive('blockquote'))} title="Citação">
                <Quote size={iconSize} />
            </button>

            {divider}

            {/* Insert */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}
                className={btn()} title="Tabela">
                <TableIcon size={iconSize} />
            </button>

            {onImageUpload && (
                <>
                    <button type="button" onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click(); }}
                        className={btn()} title="Imagem">
                        <ImageIcon size={iconSize} />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) onImageUpload(file);
                            e.target.value = '';
                        }} />
                </>
            )}

            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleCodeBlock().run(); }}
                className={btn(editor.isActive('codeBlock'))} title="Bloco de código">
                <Code size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHorizontalRule().run(); }}
                className={btn()} title="Linha divisória">
                <Minus size={iconSize} />
            </button>

            {includePageBreak && (
                <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setPageBreak().run(); }}
                    className={btn()} title="Quebra de página">
                    <SplitSquareHorizontal size={iconSize} />
                </button>
            )}

            {divider}

            {/* Alignment */}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
                className={btn(editor.isActive({ textAlign: 'left' }))} title="Alinhar à esquerda">
                <AlignLeft size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
                className={btn(editor.isActive({ textAlign: 'center' }))} title="Centralizar">
                <AlignCenter size={iconSize} />
            </button>
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
                className={btn(editor.isActive({ textAlign: 'right' }))} title="Alinhar à direita">
                <AlignRight size={iconSize} />
            </button>

            {/* Link */}
            {divider}
            <button type="button" onMouseDown={e => {
                e.preventDefault();
                if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return; }
                const url = window.prompt('URL:');
                if (url) editor.chain().focus().setLink({ href: url }).run();
            }} className={btn(editor.isActive('link'))} title="Link">
                <LinkIcon size={iconSize} />
            </button>

            {/* Picker portals */}
            {highlightOpen && (
                <PickerPortal pos={highlightPos}>
                    <HighlightSwatches editor={editor} onClose={() => setHighlightOpen(false)} />
                </PickerPortal>
            )}
            {textColorOpen && (
                <PickerPortal pos={textColorPos}>
                    <TextColorSwatches editor={editor} onClose={() => setTextColorOpen(false)} />
                </PickerPortal>
            )}
            {blockquoteOpen && (
                <PickerPortal pos={blockquotePos}>
                    <BlockquotePicker editor={editor} onClose={() => setBlockquoteOpen(false)} />
                </PickerPortal>
            )}
        </div>
    );
}
