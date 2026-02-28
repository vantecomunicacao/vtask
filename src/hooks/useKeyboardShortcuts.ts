import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar atalhos se o usuário estiver digitando em um input/textarea
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA' ||
                document.activeElement?.getAttribute('contenteditable') === 'true'
            ) {
                return;
            }

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
