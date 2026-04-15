import type { SectionKey } from '../../pages/GeradorEmail';
import { TEMPLATES } from '../../lib/emailTypes';
import type { MJMLTemplate } from '../../lib/emailTypes';
import { EmailSectionHeader } from './EmailSectionHeader';

function TemplateThumb({ id, color }: { id: string; color: string }) {
    const c = color;
    const gray = '#e5e7eb';
    const grayMid = '#d1d5db';
    const dark = '#1f2937';

    const thumbs: Record<string, React.ReactElement> = {

        // MINIMALISTA: header colorido + logo + conteúdo + botão
        newsletter: (
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="60" height="80" fill="#f0f0f0" rx="2" />
                <rect x="4" y="4" width="52" height="72" fill="white" rx="1" />
                {/* Header colorido */}
                <rect x="4" y="4" width="52" height="16" fill={c} rx="1" />
                {/* Logo */}
                <rect x="19" y="8" width="22" height="5" fill="white" rx="1" opacity="0.45" />
                {/* Título no header */}
                <rect x="14" y="15" width="32" height="3" fill="white" rx="1" opacity="0.3" />
                {/* Corpo: texto corrido à esquerda */}
                <rect x="9" y="25" width="42" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="30" width="38" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="35" width="42" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="40" width="30" height="2.5" fill={gray} rx="1" />
                {/* Botão centralizado */}
                <rect x="13" y="48" width="34" height="8" fill={c} rx="2" />
                {/* Footer */}
                <rect x="4" y="62" width="52" height="14" fill="#f9fafb" rx="1" />
                <rect x="12" y="67" width="36" height="2" fill={gray} rx="1" />
                <rect x="18" y="71" width="24" height="2" fill={gray} rx="1" />
            </svg>
        ),

        // CORPORATIVO: sem header cheio — borda colorida no topo + logo + divisor + texto denso
        comunicado: (
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="60" height="80" fill="#f0f0f0" rx="2" />
                <rect x="4" y="4" width="52" height="72" fill="white" rx="1" />
                {/* Borda top colorida (5px) */}
                <rect x="4" y="4" width="52" height="4" fill={c} rx="1" />
                {/* Logo centralizado */}
                <rect x="18" y="12" width="24" height="7" fill={gray} rx="1" />
                {/* Título escuro centralizado */}
                <rect x="12" y="23" width="36" height="3.5" fill={grayMid} rx="1" />
                {/* Divider */}
                <rect x="9" y="30" width="42" height="1" fill={gray} rx="0.5" />
                {/* Texto denso em duas colunas de linhas */}
                <rect x="9" y="34" width="42" height="2" fill={gray} rx="1" />
                <rect x="9" y="38" width="40" height="2" fill={gray} rx="1" />
                <rect x="9" y="42" width="42" height="2" fill={gray} rx="1" />
                <rect x="9" y="46" width="36" height="2" fill={gray} rx="1" />
                <rect x="9" y="50" width="42" height="2" fill={gray} rx="1" />
                <rect x="9" y="54" width="30" height="2" fill={gray} rx="1" />
                {/* Divider */}
                <rect x="9" y="59" width="42" height="1" fill={gray} rx="0.5" />
                {/* Footer */}
                <rect x="4" y="62" width="52" height="14" fill="#f9fafb" rx="1" />
                <rect x="14" y="67" width="32" height="2" fill={gray} rx="1" />
                <rect x="20" y="71" width="20" height="2" fill={gray} rx="1" />
            </svg>
        ),

        // MODERNO: header escuro (#111827) + logo + texto colorido + banner grande + botão centralizado
        promocao: (
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="60" height="80" fill="#f0f0f0" rx="2" />
                <rect x="4" y="4" width="52" height="72" fill="white" rx="1" />
                {/* Header escuro */}
                <rect x="4" y="4" width="52" height="18" fill={dark} rx="1" />
                {/* Logo no header escuro */}
                <rect x="19" y="7" width="22" height="5" fill="white" rx="1" opacity="0.2" />
                {/* Texto colorido (título tipo "OFERTA ESPECIAL") */}
                <rect x="10" y="14" width="40" height="5" fill={c} rx="1" opacity="0.85" />
                {/* Banner grande */}
                <rect x="4" y="22" width="52" height="22" fill={grayMid} rx="0" />
                <rect x="16" y="29" width="28" height="4" fill={gray} rx="1" />
                <rect x="20" y="35" width="20" height="3" fill={gray} rx="1" />
                {/* Texto centralizado */}
                <rect x="10" y="49" width="40" height="2.5" fill={gray} rx="1" />
                <rect x="13" y="53.5" width="34" height="2.5" fill={gray} rx="1" />
                {/* Botão */}
                <rect x="13" y="59" width="34" height="8" fill={c} rx="2" />
                {/* Footer */}
                <rect x="4" y="69" width="52" height="7" fill="#f9fafb" rx="1" />
                <rect x="18" y="71.5" width="24" height="2" fill={gray} rx="1" />
            </svg>
        ),

        // ALERTA: barra vermelha slim + logo + título + texto + botão vermelho
        alerta: (
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="60" height="80" fill="#f0f0f0" rx="2" />
                <rect x="4" y="4" width="52" height="72" fill="white" rx="1" />
                {/* Barra vermelha slim */}
                <rect x="4" y="4" width="52" height="9" fill="#ef4444" rx="1" />
                <rect x="12" y="6.5" width="36" height="4" fill="white" rx="1" opacity="0.3" />
                {/* Logo na área branca */}
                <rect x="18" y="17" width="24" height="6" fill={gray} rx="1" />
                {/* Título escuro */}
                <rect x="10" y="27" width="40" height="4" fill={grayMid} rx="1" />
                {/* Texto */}
                <rect x="9" y="35" width="42" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="40" width="38" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="45" width="42" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="50" width="28" height="2.5" fill={gray} rx="1" />
                {/* Botão VERMELHO */}
                <rect x="13" y="57" width="34" height="8" fill="#ef4444" rx="2" />
                {/* Footer */}
                <rect x="4" y="67" width="52" height="9" fill="#f9fafb" rx="1" />
                <rect x="14" y="70" width="32" height="2" fill={gray} rx="1" />
                <rect x="20" y="73" width="20" height="2" fill={gray} rx="1" />
            </svg>
        ),

        // BOAS-VINDAS: hero colorido com logo + texto branco + conteúdo branco + botão
        'boas-vindas': (
            <svg viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <rect width="60" height="80" fill="#f0f0f0" rx="2" />
                <rect x="4" y="4" width="52" height="72" fill="white" rx="1" />
                {/* Hero colorido grande */}
                <rect x="4" y="4" width="52" height="28" fill={c} rx="1" />
                {/* Logo no hero */}
                <rect x="18" y="9" width="24" height="6" fill="white" rx="1" opacity="0.4" />
                {/* "Bem-vindo(a)!" em branco */}
                <rect x="11" y="20" width="38" height="4" fill="white" rx="1" opacity="0.55" />
                <rect x="18" y="26" width="24" height="3" fill="white" rx="1" opacity="0.3" />
                {/* Conteúdo branco */}
                <rect x="9" y="37" width="42" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="42" width="36" height="2.5" fill={gray} rx="1" />
                <rect x="9" y="47" width="40" height="2.5" fill={gray} rx="1" />
                {/* Botão */}
                <rect x="13" y="54" width="34" height="8" fill={c} rx="2" />
                {/* Footer */}
                <rect x="4" y="64" width="52" height="12" fill="#f9fafb" rx="1" />
                <rect x="14" y="68" width="32" height="2" fill={gray} rx="1" />
                <rect x="20" y="72" width="20" height="2" fill={gray} rx="1" />
            </svg>
        ),
    };

    return thumbs[id] ?? thumbs['newsletter'];
}

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
    getTemplateHeaderColor: () => string;
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
                            {TEMPLATES.map((t: MJMLTemplate) => {
                                const isSelected = internalTemplateId === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => onTemplateChange(t.id)}
                                        className={`relative flex flex-col rounded-lg border-2 overflow-hidden text-left transition-all ${isSelected ? 'border-brand shadow-sm' : 'border-border-subtle hover:border-brand/40'}`}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand flex items-center justify-center z-10">
                                                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                                                    <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="w-full aspect-[3/4] bg-surface-2 p-1.5">
                                            <TemplateThumb id={t.id} color={t.color} />
                                        </div>
                                        <div className="px-2 py-1.5 border-t border-border-subtle">
                                            <p className={`text-[11px] font-semibold ${isSelected ? 'text-brand' : 'text-primary'}`}>{t.label}</p>
                                            <p className="text-[9px] text-muted leading-tight mt-0.5">{t.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
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
