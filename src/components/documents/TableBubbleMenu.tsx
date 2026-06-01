import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import {
    Plus, Trash2, Combine, SplitSquareHorizontal,
    PaintBucket, Rows2, Columns2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

// ─── Cell background colors ───────────────────────────────────────

const CELL_BG_COLORS = [
    { color: null,       label: 'Padrão'    },
    { color: '#FEF9C3',  label: 'Amarelo'   },
    { color: '#DCFCE7',  label: 'Verde'     },
    { color: '#DBEAFE',  label: 'Azul'      },
    { color: '#FCE7F3',  label: 'Rosa'      },
    { color: '#FEE2E2',  label: 'Vermelho'  },
    { color: '#EDE9FE',  label: 'Roxo'      },
    { color: '#F3F4F6',  label: 'Cinza'     },
    { color: '#FED7AA',  label: 'Laranja'   },
    { color: '#BAE6FD',  label: 'Azul claro'},
    { color: '#BBF7D0',  label: 'Verde claro'},
    { color: '#DDD6FE',  label: 'Lavanda'   },
];

// ─── Component ────────────────────────────────────────────────────

export function TableBubbleMenu({ editor }: { editor: Editor }) {
    const [colorOpen, setColorOpen] = useState(false);
    const [colorPos, setColorPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                !target.closest('[data-table-color-picker]') &&
                !target.closest('[data-table-color-btn]')
            ) {
                setColorOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Button styles ─────────────────────────────────────────────
    const btn = (active = false, danger = false) => cn(
        'flex items-center gap-1 px-1.5 py-1 rounded-[var(--radius-xs)] text-[11px] font-medium transition-colors shrink-0 select-none',
        danger
            ? 'text-red-500 hover:bg-red-50'
            : active
                ? 'text-brand bg-brand/10'
                : 'text-secondary hover:bg-surface-0 hover:text-primary',
    );

    const disabledBtn = cn(
        'flex items-center gap-1 px-1.5 py-1 rounded-[var(--radius-xs)] text-[11px] font-medium transition-colors shrink-0 select-none',
        'text-secondary/40 cursor-not-allowed',
    );

    const divider = <div className="w-px h-4 bg-border-subtle mx-0.5 shrink-0" />;

    const currentCellBg =
        editor.getAttributes('tableCell').backgroundColor ??
        editor.getAttributes('tableHeader').backgroundColor ??
        null;

    const canMerge = editor.can().mergeCells();
    const canSplit = editor.can().splitCell();

    return (
        <>
            <BubbleMenu
                editor={editor}
                pluginKey="tableBubbleMenu"
                shouldShow={({ editor: e }) => e.isActive('table')}
                getReferencedVirtualElement={() => {
                    const { view } = editor;
                    const { from } = editor.state.selection;
                    try {
                        const domAtPos = view.domAtPos(from, 0);
                        let node = (domAtPos.node.nodeType === Node.TEXT_NODE
                            ? domAtPos.node.parentElement
                            : domAtPos.node) as HTMLElement | null;
                        while (node && node.tagName !== 'TD' && node.tagName !== 'TH' && node !== view.dom) {
                            node = node.parentElement;
                        }
                        if (node && (node.tagName === 'TD' || node.tagName === 'TH')) {
                            return { getBoundingClientRect: () => node!.getBoundingClientRect() };
                        }
                    } catch { /* fallback */ }
                    return null;
                }}
                className="flex items-center bg-surface-card border border-border-subtle rounded-[var(--radius-sm)] shadow-float px-1.5 py-1 gap-0.5 overflow-x-auto max-w-[90vw]"
            >
                {/* ── Linhas ── */}
                <span className="text-[9px] text-muted uppercase tracking-widest font-bold px-1 flex items-center gap-0.5 shrink-0">
                    <Rows2 size={10} />
                </span>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }}
                    className={btn()}
                    title="Inserir linha acima"
                >
                    <Plus size={10} />↑
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}
                    className={btn()}
                    title="Inserir linha abaixo"
                >
                    <Plus size={10} />↓
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}
                    className={btn(false, true)}
                    title="Excluir linha atual"
                >
                    <Trash2 size={10} />
                </button>

                {divider}

                {/* ── Colunas ── */}
                <span className="text-[9px] text-muted uppercase tracking-widest font-bold px-1 flex items-center gap-0.5 shrink-0">
                    <Columns2 size={10} />
                </span>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }}
                    className={btn()}
                    title="Inserir coluna à esquerda"
                >
                    <Plus size={10} />←
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}
                    className={btn()}
                    title="Inserir coluna à direita"
                >
                    <Plus size={10} />→
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}
                    className={btn(false, true)}
                    title="Excluir coluna atual"
                >
                    <Trash2 size={10} />
                </button>

                {divider}

                {/* ── Células ── */}
                {canMerge ? (
                    <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }}
                        className={btn()}
                        title="Mesclar células selecionadas"
                    >
                        <Combine size={11} /> Mesclar
                    </button>
                ) : (
                    <span className={disabledBtn} title="Selecione múltiplas células para mesclar">
                        <Combine size={11} /> Mesclar
                    </span>
                )}
                {canSplit ? (
                    <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); editor.chain().focus().splitCell().run(); }}
                        className={btn()}
                        title="Separar célula mesclada"
                    >
                        <SplitSquareHorizontal size={11} /> Separar
                    </button>
                ) : (
                    <span className={disabledBtn} title="Célula não está mesclada">
                        <SplitSquareHorizontal size={11} /> Separar
                    </span>
                )}

                {/* Cor de fundo da célula */}
                <button
                    type="button"
                    data-table-color-btn
                    onMouseDown={e => {
                        e.preventDefault();
                        const r = e.currentTarget.getBoundingClientRect();
                        setColorPos({ top: r.bottom + 4, left: r.left });
                        setColorOpen(v => !v);
                    }}
                    className={cn(btn(!!currentCellBg), 'gap-1.5')}
                    title="Cor de fundo da célula"
                >
                    <PaintBucket size={11} />
                    <div
                        className="w-2.5 h-2.5 rounded-[2px] border border-border-strong shrink-0"
                        style={{ backgroundColor: currentCellBg ?? 'transparent' }}
                    />
                </button>

                {divider}

                {/* ── Cabeçalhos ── */}
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); }}
                    className={btn()}
                    title="Alternar primeira linha como cabeçalho"
                >
                    Cab. ↕
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeaderColumn().run(); }}
                    className={btn()}
                    title="Alternar primeira coluna como cabeçalho"
                >
                    Cab. ↔
                </button>
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeaderCell().run(); }}
                    className={btn(editor.isActive('tableHeader'))}
                    title="Alternar célula atual como cabeçalho"
                >
                    Cab. célula
                </button>

                {divider}

                {/* ── Excluir tabela ── */}
                <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}
                    className={cn(btn(false, true), 'gap-1')}
                    title="Excluir tabela inteira"
                >
                    <Trash2 size={11} /> Tabela
                </button>
            </BubbleMenu>

            {/* ── Color picker portal ── */}
            {colorOpen && createPortal(
                <div
                    data-table-color-picker
                    style={{ position: 'fixed', top: colorPos.top, left: colorPos.left, zIndex: 9999 }}
                    className="bg-surface-card border border-border-subtle rounded-[var(--radius-card)] shadow-float p-2.5 flex flex-col gap-2"
                >
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted px-0.5">
                        Fundo da célula
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                        {CELL_BG_COLORS.map(({ color, label }) => (
                            <button
                                key={label}
                                type="button"
                                onMouseDown={e => {
                                    e.preventDefault();
                                    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
                                    setColorOpen(false);
                                }}
                                title={label}
                                className="w-7 h-7 rounded-[var(--radius-sm)] border-2 border-transparent hover:border-brand transition-all hover:scale-110 relative flex items-center justify-center"
                                style={{ backgroundColor: color ?? '#ffffff', border: color === null ? '1.5px dashed var(--color-border-strong)' : undefined }}
                            >
                                {color === null && (
                                    <span className="text-[9px] text-muted font-bold leading-none">✕</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
