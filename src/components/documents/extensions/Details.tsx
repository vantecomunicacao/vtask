import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { ChevronRight } from 'lucide-react';

// ─── NodeView React Component ──────────────────────────────────────
function DetailsNodeView({ node, updateAttributes }: NodeViewProps) {
    const { open, title } = node.attrs as { open: boolean; title: string };

    return (
        <NodeViewWrapper>
            <div className="tiptap-details" data-open={String(open)}>
                <div className="tiptap-details-header" contentEditable={false}>
                    <button
                        className="tiptap-details-toggle"
                        onClick={() => updateAttributes({ open: !open })}
                    >
                        <ChevronRight
                            size={13}
                            className="tiptap-details-arrow"
                            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                        />
                    </button>
                    <input
                        className="tiptap-details-title"
                        value={title || ''}
                        onChange={e => updateAttributes({ title: e.target.value })}
                        placeholder="Toggle"
                    />
                </div>
                {open && (
                    <div className="tiptap-details-content">
                        <NodeViewContent />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

// ─── Tiptap Node ──────────────────────────────────────────────────
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        details: {
            insertDetails: () => ReturnType;
        };
    }
}

export const Details = Node.create({
    name: 'details',
    group: 'block',
    content: 'block+',
    defining: true,

    addAttributes() {
        return {
            open: { default: true },
            title: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-details]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-details': '' }), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DetailsNodeView);
    },

    addCommands() {
        return {
            insertDetails: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { open: true, title: '' },
                    content: [{ type: 'paragraph' }],
                });
            },
        };
    },
});
