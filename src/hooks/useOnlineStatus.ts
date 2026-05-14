import { useEffect } from 'react';
import { toast } from 'sonner';

export function useOnlineStatus() {
    useEffect(() => {
        let wentOffline = false;

        const handleOffline = () => {
            wentOffline = true;
            toast.warning('Sem conexão com a internet', {
                id: 'offline-status',
                duration: Infinity,
                description: 'Alterações não serão salvas até a conexão ser restaurada.',
            });
        };

        const handleOnline = () => {
            if (!wentOffline) return;
            wentOffline = false;
            toast.dismiss('offline-status');
            toast.success('Conexão restaurada', { id: 'online-status', duration: 3000 });
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);
}
