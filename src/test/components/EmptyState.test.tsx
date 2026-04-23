import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';

describe('EmptyState', () => {
    it('renders title', () => {
        render(<EmptyState icon={Inbox} title="Nenhuma tarefa" />);
        expect(screen.getByText('Nenhuma tarefa')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(<EmptyState icon={Inbox} title="Vazio" description="Crie sua primeira tarefa" />);
        expect(screen.getByText('Crie sua primeira tarefa')).toBeInTheDocument();
    });

    it('does not render description when omitted', () => {
        render(<EmptyState icon={Inbox} title="Vazio" />);
        expect(screen.queryByText(/crie/i)).not.toBeInTheDocument();
    });

    it('renders action button when action is provided', () => {
        render(
            <EmptyState
                icon={Inbox}
                title="Vazio"
                action={{ label: 'Criar tarefa', onClick: vi.fn() }}
            />
        );
        expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeInTheDocument();
    });

    it('calls action.onClick when button is clicked', async () => {
        const onClick = vi.fn();
        render(
            <EmptyState
                icon={Inbox}
                title="Vazio"
                action={{ label: 'Criar', onClick }}
            />
        );
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('shows loading state on action button', () => {
        render(
            <EmptyState
                icon={Inbox}
                title="Vazio"
                action={{ label: 'Criar', onClick: vi.fn(), loading: true }}
            />
        );
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('renders with variant="bordered"', () => {
        const { container } = render(
            <EmptyState icon={Inbox} title="Vazio" variant="bordered" />
        );
        expect(container.firstChild).toHaveClass('border-dashed');
    });

    it('renders with variant="default" (no dashed border)', () => {
        const { container } = render(
            <EmptyState icon={Inbox} title="Vazio" variant="default" />
        );
        expect(container.firstChild).not.toHaveClass('border-dashed');
    });

    it('applies custom className', () => {
        const { container } = render(
            <EmptyState icon={Inbox} title="Vazio" className="mt-10" />
        );
        expect(container.firstChild).toHaveClass('mt-10');
    });

    it('renders an svg icon', () => {
        const { container } = render(<EmptyState icon={Inbox} title="Vazio" />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });
});
