import { Select } from '../ui/Select';
import type { EmailProfile } from '../../lib/emailTypes';
import type { SectionKey } from '../../pages/GeradorEmail';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    profiles: EmailProfile[];
    selectedProfile: EmailProfile | null;
    onProfileChange: (profile: EmailProfile | null) => void;
    onManageProfiles: () => void;
}

export function EmailPerfilSection({ openSections, toggle, profiles, selectedProfile, onProfileChange, onManageProfiles }: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Perfil do Cliente" sectionKey="perfil" openSections={openSections} toggle={toggle} />
            {openSections.perfil && (
                <div className="px-5 pb-4 space-y-2">
                    <div className="flex gap-2">
                        <Select
                            value={selectedProfile?.id ?? ''}
                            onChange={e => {
                                const p = profiles.find(p => p.id === e.target.value) ?? null;
                                onProfileChange(p);
                            }}
                            containerClassName="flex-1"
                        >
                            <option value="">Selecione um perfil...</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                        <button
                            onClick={onManageProfiles}
                            title="Gerenciar perfis"
                            className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-subtle text-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-all flex-shrink-0 mt-auto"
                        >
                            ✏️
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
