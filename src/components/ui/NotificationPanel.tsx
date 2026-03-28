import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotificationStore, type AppNotification } from '../../store/notificationStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { cn } from '../../lib/utils';

const TYPE_LABEL: Record<AppNotification['type'], string> = {
    task_assigned: 'atribuiu uma tarefa a você',
    comment: 'comentou em uma tarefa',
    mention: 'mencionou você',
};

export function NotificationPanel() {
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
    const { activeWorkspace } = useWorkspaceStore();

    useEffect(() => {
        if (activeWorkspace) fetchNotifications(activeWorkspace.id);
    }, [activeWorkspace, fetchNotifications]);

    // Fechar ao clicar fora
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleMarkAllAsRead = () => {
        if (activeWorkspace) markAllAsRead(activeWorkspace.id);
    };

    return (
        <div ref={panelRef} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className="relative p-2 rounded-lg text-muted hover:bg-surface-0 hover:text-secondary transition-colors"
                aria-label="Notificações"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-brand rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-card rounded-card shadow-modal border border-border-subtle z-50 overflow-hidden fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                        <span className="text-sm font-bold text-primary">Notificações</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-1.5 text-[11px] text-brand hover:text-brand/80 font-medium transition-colors"
                            >
                                <CheckCheck size={13} />
                                Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted">
                                <Inbox size={28} className="opacity-40" />
                                <span className="text-sm">Nenhuma notificação</span>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => { if (!n.read) markAsRead(n.id); }}
                                    className={cn(
                                        'w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 transition-colors hover:bg-surface-0',
                                        !n.read && 'bg-brand/5'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Dot */}
                                        <div className={cn(
                                            'w-2 h-2 rounded-full mt-1.5 shrink-0',
                                            n.read ? 'bg-transparent' : 'bg-brand'
                                        )} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-primary leading-snug">
                                                <span className="font-semibold">{n.actor_name ?? 'Alguém'}</span>
                                                {' '}{TYPE_LABEL[n.type]}
                                                {n.task_title && (
                                                    <span className="font-medium text-secondary"> "{n.task_title}"</span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-muted mt-0.5">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
