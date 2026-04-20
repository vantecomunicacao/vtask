import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
    const src = node.attrs.src as string;
    const width = (node.attrs.width as number | null) ?? null;

    const imgRef = useRef<HTMLImageElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const startX = useRef(0);
    const startW = useRef(0);

    const onMouseDown = useCallback((e: React.MouseEvent, dir: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        startX.current = e.clientX;
        startW.current = imgRef.current?.offsetWidth ?? (width ?? 400);
        setIsResizing(true);

        const onMove = (ev: MouseEvent) => {
            const delta = dir === 'right'
                ? ev.clientX - startX.current
                : startX.current - ev.clientX;
            const newW = Math.max(80, Math.min(startW.current + delta, 1200));
            updateAttributes({ width: Math.round(newW) });
        };

        const onUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [width, updateAttributes]);

    useEffect(() => {
        if (isResizing) document.body.style.cursor = 'ew-resize';
        else document.body.style.cursor = '';
        return () => { document.body.style.cursor = ''; };
    }, [isResizing]);

    return (
        <NodeViewWrapper
            as="span"
            style={{ display: 'inline-block', position: 'relative', lineHeight: 0 }}
            data-drag-handle
        >
            <span
                style={{
                    display: 'inline-block',
                    position: 'relative',
                    lineHeight: 0,
                    userSelect: 'none',
                }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={node.attrs.alt as string ?? ''}
                    style={{
                        width: width ? `${width}px` : undefined,
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: '8px',
                        border: selected ? '2px solid var(--color-brand)' : '2px solid transparent',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        margin: '1rem 0',
                        transition: 'border-color 0.15s',
                        cursor: 'default',
                    }}
                    draggable={false}
                />

                {/* Handles — only visible when selected */}
                {selected && (
                    <>
                        <Handle side="left"  onMouseDown={e => onMouseDown(e, 'left')} />
                        <Handle side="right" onMouseDown={e => onMouseDown(e, 'right')} />
                    </>
                )}

                {/* Width badge */}
                {selected && width && (
                    <span style={{
                        position: 'absolute', bottom: 8, left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.55)', color: '#fff',
                        fontSize: 11, padding: '1px 7px', borderRadius: 999,
                        pointerEvents: 'none', whiteSpace: 'nowrap',
                    }}>
                        {width}px
                    </span>
                )}
            </span>
        </NodeViewWrapper>
    );
}

function Handle({ side, onMouseDown }: {
    side: 'left' | 'right';
    onMouseDown: (e: React.MouseEvent) => void;
}) {
    return (
        <span
            onMouseDown={onMouseDown}
            style={{
                position: 'absolute',
                top: '50%',
                [side]: -5,
                transform: 'translateY(-50%)',
                width: 10,
                height: 32,
                background: 'white',
                border: '1.5px solid var(--color-brand)',
                borderRadius: 4,
                cursor: 'ew-resize',
                zIndex: 10,
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        />
    );
}

export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: el => {
                    const w = el.getAttribute('width') || el.style.width;
                    return w ? parseInt(w) : null;
                },
                renderHTML: attrs => attrs.width ? { width: attrs.width } : {},
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});
