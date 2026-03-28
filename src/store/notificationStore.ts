import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface AppNotification {
    id: string;
    workspace_id: string;
    user_id: string;
    actor_id: string;
    actor_name: string | null;
    type: 'task_assigned' | 'comment' | 'mention';
    task_id: string | null;
    task_title: string | null;
    read: boolean;
    created_at: string;
}

interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    channel: RealtimeChannel | null;
    fetchNotifications: (workspaceId: string) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: (workspaceId: string) => Promise<void>;
    subscribeToNotifications: (userId: string) => void;
    unsubscribe: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    channel: null,

    fetchNotifications: async (workspaceId: string) => {
        const { data } = await supabase
            .from('notifications')
            .select('*, actor:profiles!actor_id(full_name)')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(30);

        if (data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const notifications: AppNotification[] = data.map((n: any) => ({
                ...n,
                actor_name: n.actor?.full_name ?? null,
            }));
            set({ notifications, unreadCount: notifications.filter(n => !n.read).length });
        }
    },

    markAsRead: async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        set(state => ({
            notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));
    },

    markAllAsRead: async (workspaceId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .eq('read', false);
        set(state => ({
            notifications: state.notifications.map(n => ({ ...n, read: true })),
            unreadCount: 0,
        }));
    },

    subscribeToNotifications: (userId: string) => {
        const existing = get().channel;
        if (existing) supabase.removeChannel(existing);

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`,
            }, async (payload) => {
                const { data } = await supabase
                    .from('notifications')
                    .select('*, actor:profiles!actor_id(full_name)')
                    .eq('id', payload.new.id)
                    .single();

                if (data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const notification: AppNotification = { ...(data as any), actor_name: (data as any).actor?.full_name ?? null };
                    set(state => ({
                        notifications: [notification, ...state.notifications],
                        unreadCount: state.unreadCount + 1,
                    }));
                }
            })
            .subscribe();

        set({ channel });
    },

    unsubscribe: () => {
        const ch = get().channel;
        if (ch) { supabase.removeChannel(ch); set({ channel: null }); }
    },
}));

// Helper exportado — usado pelo taskStore e TaskComments
export async function createNotification(params: {
    workspace_id: string;
    user_id: string;
    actor_id: string;
    type: 'task_assigned' | 'comment' | 'mention';
    task_id?: string;
    task_title?: string;
}) {
    if (params.user_id === params.actor_id) return; // não notifica a si mesmo
    await supabase.from('notifications').insert({
        workspace_id: params.workspace_id,
        user_id: params.user_id,
        actor_id: params.actor_id,
        type: params.type,
        task_id: params.task_id ?? null,
        task_title: params.task_title ?? null,
    });
}
