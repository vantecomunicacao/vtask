import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Dialog } from '../../components/ui/Dialog';

function renderDialog(props: Partial<React.ComponentProps<typeof Dialog>> = {}) {
    return render(
        <Dialog
            isOpen={true}
            onClose={vi.fn()}
            title="Título"
            {...props}
        >
            <p>Conteúdo</p>
        </Dialog>
    );
}

describe('Dialog', () => {
    it('renders nothing when isOpen=false', () => {
        const { container } = render(
            <Dialog isOpen={false} onClose={vi.fn()} title="T">
                <p>hidden</p>
            </Dialog>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders title and children when isOpen=true', () => {
        renderDialog();
        expect(screen.getByText('Título')).toBeInTheDocument();
        expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    });

    it('has role="dialog" and aria-modal', () => {
        renderDialog();
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('calls onClose when Escape is pressed', () => {
        const onClose = vi.fn();
        renderDialog({ onClose });
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when overlay (backdrop) is clicked', async () => {
        const onClose = vi.fn();
        const { container } = renderDialog({ onClose });
        const overlay = container.querySelector('.absolute.inset-0') as HTMLElement;
        await userEvent.click(overlay);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('does NOT call onClose when dialog content is clicked', async () => {
        const onClose = vi.fn();
        renderDialog({ onClose });
        await userEvent.click(screen.getByRole('dialog'));
        expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onClose when the close button is clicked', async () => {
        const onClose = vi.fn();
        renderDialog({ onClose });
        await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('renders headerActions', () => {
        renderDialog({ headerActions: <button>Extra</button> });
        expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument();
    });

    it('renders title as ReactNode', () => {
        renderDialog({ title: <span data-testid="custom-title">Custom</span> });
        expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    });

    describe('sheet mode', () => {
        it('renders drag handle on mobile (hidden on md+)', () => {
            const { container } = renderDialog({ sheet: true });
            const handle = container.querySelector('.md\\:hidden');
            expect(handle).toBeInTheDocument();
        });

        it('still renders title and children in sheet mode', () => {
            renderDialog({ sheet: true });
            expect(screen.getByText('Título')).toBeInTheDocument();
            expect(screen.getByText('Conteúdo')).toBeInTheDocument();
        });

        it('calls onClose from close button in sheet mode', async () => {
            const onClose = vi.fn();
            renderDialog({ sheet: true, onClose });
            await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
            expect(onClose).toHaveBeenCalledOnce();
        });
    });

    describe('focus management', () => {
        it('traps Tab within the dialog (last → first)', async () => {
            render(
                <Dialog isOpen={true} onClose={vi.fn()} title="T">
                    <button>Primeiro</button>
                    <button>Último</button>
                </Dialog>
            );
            const buttons = screen.getAllByRole('button');
            const last = buttons[buttons.length - 1];
            last.focus();
            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: false });
            expect(document.activeElement).toBe(buttons[0]);
        });

        it('traps Shift+Tab within the dialog (first → last)', async () => {
            render(
                <Dialog isOpen={true} onClose={vi.fn()} title="T">
                    <button>Primeiro</button>
                    <button>Último</button>
                </Dialog>
            );
            const buttons = screen.getAllByRole('button');
            buttons[0].focus();
            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
            expect(document.activeElement).toBe(buttons[buttons.length - 1]);
        });
    });
});
