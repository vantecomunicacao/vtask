import { useState } from 'react';

/** Gerencia todo o estado de UI do DocumentEditor, sem dependência do editor Tiptap. */
export function useDocumentEditorState(initialTitle: string) {
    const [title, setTitle] = useState(initialTitle);
    const [saving, setSaving] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [showVersionPanel, setShowVersionPanel] = useState(false);
    const [pageViewMode, setPageViewMode] = useState(false);
    const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
    const [highlightPickerOpen, setHighlightPickerOpen] = useState<'bubble' | null>(null);
    const [blockquotePickerOpen, setBlockquotePickerOpen] = useState<'bubble' | null>(null);
    const [highlightPickerPos, setHighlightPickerPos] = useState({ top: 0, left: 0 });
    const [blockquotePickerPos, setBlockquotePickerPos] = useState({ top: 0, left: 0 });

    return {
        title, setTitle,
        saving, setSaving,
        wordCount, setWordCount,
        showVersionPanel, setShowVersionPanel,
        pageViewMode, setPageViewMode,
        projectDropdownOpen, setProjectDropdownOpen,
        highlightPickerOpen, setHighlightPickerOpen,
        blockquotePickerOpen, setBlockquotePickerOpen,
        highlightPickerPos, setHighlightPickerPos,
        blockquotePickerPos, setBlockquotePickerPos,
    };
}
