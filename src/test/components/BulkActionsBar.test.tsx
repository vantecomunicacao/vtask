import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkActionsBar } from '../../components/tasks/BulkActionsBar';

describe('BulkActionsBar', () => {
    it('renders nothing when selectedCount is 0', () => {
        const { container } = render(
            <BulkActionsBar
                selectedCount={0}
                onCompleteAll={vi.fn()}
                onDeleteAll={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders the bar when selectedCount > 0', () => {
        render(
            <BulkActionsBar
                selectedCount={3}
                onCompleteAll={vi.fn()}
                onDeleteAll={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText('3 SELECIONADAS')).toBeInTheDocument();
    });

    it('calls onCompleteAll when "Concluir" is clicked', async () => {
        const onCompleteAll = vi.fn();
        render(
            <BulkActionsBar
                selectedCount={2}
                onCompleteAll={onCompleteAll}
                onDeleteAll={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        await userEvent.click(screen.getByText(/concluir/i));
        expect(onCompleteAll).toHaveBeenCalledOnce();
    });

    it('calls onDeleteAll when "Excluir" is clicked', async () => {
        const onDeleteAll = vi.fn();
        render(
            <BulkActionsBar
                selectedCount={2}
                onCompleteAll={vi.fn()}
                onDeleteAll={onDeleteAll}
                onCancel={vi.fn()}
            />
        );
        await userEvent.click(screen.getByText(/excluir/i));
        expect(onDeleteAll).toHaveBeenCalledOnce();
    });

    it('calls onCancel when "Cancelar" is clicked', async () => {
        const onCancel = vi.fn();
        render(
            <BulkActionsBar
                selectedCount={1}
                onCompleteAll={vi.fn()}
                onDeleteAll={vi.fn()}
                onCancel={onCancel}
            />
        );
        await userEvent.click(screen.getByText(/cancelar/i));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('displays the correct count in the label', () => {
        render(
            <BulkActionsBar
                selectedCount={7}
                onCompleteAll={vi.fn()}
                onDeleteAll={vi.fn()}
                onCancel={vi.fn()}
            />
        );
        expect(screen.getByText('7 SELECIONADAS')).toBeInTheDocument();
    });
});
