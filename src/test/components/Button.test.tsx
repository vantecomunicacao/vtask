import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
    it('renders children', () => {
        render(<Button>Salvar</Button>);
        expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
    });

    it('calls onClick when clicked', async () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Clique</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledOnce();
    });

    it('is disabled when disabled prop is set', () => {
        render(<Button disabled>Desabilitado</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled and shows spinner when isLoading', () => {
        render(<Button isLoading>Salvando</Button>);
        const btn = screen.getByRole('button');
        expect(btn).toBeDisabled();
        expect(btn.querySelector('svg')).toBeInTheDocument();
    });

    it('does not fire onClick when disabled', async () => {
        const onClick = vi.fn();
        render(<Button disabled onClick={onClick}>Clique</Button>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('applies variant classes — ghost', () => {
        render(<Button variant="ghost">Ghost</Button>);
        expect(screen.getByRole('button').className).toContain('bg-transparent');
    });

    it('applies variant classes — danger', () => {
        render(<Button variant="danger">Deletar</Button>);
        expect(screen.getByRole('button').className).toContain('bg-brand-light');
    });

    it('applies size class — sm', () => {
        render(<Button size="sm">Sm</Button>);
        expect(screen.getByRole('button').className).toContain('h-8');
    });

    it('applies size class — lg', () => {
        render(<Button size="lg">Lg</Button>);
        expect(screen.getByRole('button').className).toContain('h-12');
    });

    it('merges custom className', () => {
        render(<Button className="my-custom">OK</Button>);
        expect(screen.getByRole('button').className).toContain('my-custom');
    });

    it('forwards ref', () => {
        const ref = React.createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Ref</Button>);
        expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
});
