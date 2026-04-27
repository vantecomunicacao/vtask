import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const el = document.activeElement as HTMLElement | null;
            if (!el) return;
            // Ignorar se estiver digitando em qualquer campo de texto ou editor
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
            if (el.getAttribute('contenteditable') === 'true') return;
            if (el.closest('[contenteditable="true"]')) return;
            // Ignorar se foco estiver dentro de um dialog/modal aberto
            if (el.closest('[role="dialog"]')) return;

            // G T -> Ir para Tarefas
            if (e.key.toLowerCase() === 't') {
                e.preventDefault();
                navigate('/tarefas');
            }

            // G P -> Ir para Projetos
            if (e.key.toLowerCase() === 'p') {
                e.preventDefault();
                navigate('/projetos');
            }

            // G D -> Ir para Dashboard
            if (e.key.toLowerCase() === 'd') {
                e.preventDefault();
                navigate('/dashboard');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);
}
