import type { SectionKey } from '../../pages/GeradorEmail';
import { TEMPLATES } from '../../lib/emailTypes';
import type { MJMLTemplate } from '../../lib/emailTypes';
import { EmailSectionHeader } from './EmailSectionHeader';

interface Props {
    openSections: Record<SectionKey, boolean>;
    toggle: (k: SectionKey) => void;
    internalTemplateId: string;
    onTemplateChange: (id: string) => void;
    title: string;
    onTitleChange: (v: string) => void;
    buttonText: string;
    onButtonTextChange: (v: string) => void;
    buttonLink: string;
    onButtonLinkChange: (v: string) => void;
    logoUrl: string;
    bannerUrl: string;
    bottomImageUrl: string;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'logo' | 'banner' | 'bottom') => void;
    bgColor: string;
    onBgColorChange: (v: string) => void;
    buttonColor: string;
    onButtonColorChange: (v: string) => void;
    getTemplateHeaderColor: (id: string) => string;
}

export function EmailDesignSection({
    openSections, toggle,
    internalTemplateId, onTemplateChange,
    title, onTitleChange,
    buttonText, onButtonTextChange,
    buttonLink, onButtonLinkChange,
    logoUrl, bannerUrl, bottomImageUrl, onFileUpload,
    bgColor, onBgColorChange,
    buttonColor, onButtonColorChange,
    getTemplateHeaderColor,
}: Props) {
    return (
        <div className="border-b">
            <EmailSectionHeader title="Design" sectionKey="design" openSections={openSections} toggle={toggle} />
            {openSections.design && (
                <div className="px-5 pb-5 space-y-4">

                    {/* Template cards */}
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-2">Template</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map((t: MJMLTemplate) => (
                                <button
                                    key={t.id}
                                    onClick={() => onTemplateChange(t.id)}
                                    className={`flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all ${internalTemplateId === t.id ? 'border-brand' : 'border-border-subtle hover:border-border-subtle'} ${t.id === 'boas-vindas' ? 'col-span-2 flex-row items-center' : ''}`}
                                >
                                    {t.id === 'boas-vindas' ? (
                                        <>
                                            <div style={{ backgroundColor: t.color }} className="w-1.5 self-stretch flex-shrink-0" />
                                            <div className="px-3 py-2">
                                                <p className="text-xs font-medium text-primary">{t.label}</p>
                                                <p className="text-[10px] text-muted">{t.desc}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ backgroundColor: getTemplateHeaderColor(t.id) }} className="h-4 w-full flex-shrink-0" />
                                            <div className="px-2 py-1.5">
                                                <p className="text-xs font-medium text-primary">{t.label}</p>
                                                <p className="text-[10px] text-muted">{t.desc}</p>
                                            </div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Título */}
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-1.5">Título no e-mail</label>
                        <input
                            type="text"
                            placeholder="Título visível no corpo do e-mail"
                            value={title}
                            onChange={e => onTitleChange(e.target.value)}
                            className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>

                    {/* CTA */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1.5">Texto do botão</label>
                            <input type="text" placeholder="Saiba mais" value={buttonText} onChange={e => onButtonTextChange(e.target.value)}
                                className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1.5">Link do botão</label>
                            <input type="text" placeholder="https://..." value={buttonLink} onChange={e => onButtonLinkChange(e.target.value)}
                                className="w-full h-9 rounded-md border border-border-subtle px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />
                        </div>
                    </div>

                    {/* Imagens */}
                    <div>
                        <label className="block text-xs font-medium text-secondary mb-2">Imagens</label>
                        <div className="space-y-1.5">
                            {([
                                { key: 'logo' as const, label: 'Logotipo', url: logoUrl },
                                { key: 'banner' as const, label: 'Banner principal', url: bannerUrl },
                                { key: 'bottom' as const, label: 'Imagem rodapé', url: bottomImageUrl },
                            ]).map(({ key, label, url }) => (
                                <label
                                    key={key}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border border-dashed cursor-pointer hover:bg-surface-2 transition-colors ${url ? 'border-green-300 bg-green-50/40' : 'border-border-subtle'}`}
                                >
                                    <span className="text-xs font-medium text-secondary w-24 flex-shrink-0">{label}</span>
                                    {url
                                        ? <span className="text-xs text-green-600 font-medium">✓ Enviada</span>
                                        : <span className="text-xs text-muted">Clique para enviar</span>
                                    }
                                    <input type="file" className="hidden" onChange={e => onFileUpload(e, key)} accept="image/*" />
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Cores */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1.5">Cor de fundo</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={bgColor} onChange={e => onBgColorChange(e.target.value)}
                                    className="h-9 w-9 rounded-md cursor-pointer border p-0.5 flex-shrink-0" />
                                <span className="text-xs text-muted font-mono">{bgColor}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-secondary mb-1.5">Cor de destaque</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={buttonColor} onChange={e => onButtonColorChange(e.target.value)}
                                    className="h-9 w-9 rounded-md cursor-pointer border p-0.5 flex-shrink-0" />
                                <span className="text-xs text-muted font-mono">{buttonColor}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
