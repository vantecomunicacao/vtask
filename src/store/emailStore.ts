import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { EmailProfile, EmailDraft, MailchimpList } from '../lib/emailTypes';
import { toast } from 'sonner';

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro desconhecido';
}

interface EmailState {
  profiles: EmailProfile[];
  selectedProfile: EmailProfile | null;
  drafts: EmailDraft[];
  mailchimpLists: MailchimpList[];
  loading: boolean;

  // Actions
  fetchProfiles: () => Promise<void>;
  setSelectedProfile: (profile: EmailProfile | null) => void;
  fetchDrafts: () => Promise<void>;
  saveDraft: (name: string, subject: string, body: string, profileId?: string) => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  setMailchimpLists: (lists: MailchimpList[]) => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  profiles: [],
  selectedProfile: null,
  drafts: [],
  mailchimpLists: [],
  loading: false,

  fetchProfiles: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('email_profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ profiles: data as EmailProfile[] });
    } catch (err) {
      toast.error('Erro ao buscar perfis: ' + toMessage(err));
    } finally {
      set({ loading: false });
    }
  },

  setSelectedProfile: (profile) => set({ selectedProfile: profile }),

  fetchDrafts: async () => {
    try {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      set({ drafts: data as EmailDraft[] });
    } catch (err) {
      toast.error('Erro ao buscar rascunhos: ' + toMessage(err));
    }
  },

  saveDraft: async (name, subject, body, profileId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('email_drafts')
        .insert({
          name,
          subject,
          body,
          profile_id: profileId,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      set(state => ({ drafts: [data as EmailDraft, ...state.drafts] }));
      toast.success('Rascunho salvo!');
    } catch (err) {
      toast.error('Erro ao salvar rascunho: ' + toMessage(err));
    }
  },

  deleteDraft: async (id) => {
    try {
      const { error } = await supabase
        .from('email_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set(state => ({ drafts: state.drafts.filter(d => d.id !== id) }));
      toast.success('Rascunho removido');
    } catch (err) {
      toast.error('Erro ao remover rascunho: ' + toMessage(err));
    }
  },

  setMailchimpLists: (lists) => set({ mailchimpLists: lists }),
}));
