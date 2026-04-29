import * as React from 'react';
import { useState } from 'react';
import { Inbox, Folder, Layers, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { FormGrid, FormField, FormActions } from '../components/ui/FormLayout';
import { typography, modalSizes, CHART_PALETTE } from '../lib/designTokens';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DemoBox({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('p-6 bg-surface-0 rounded-card border border-border-subtle flex flex-wrap gap-3 items-center', className)}>
            {children}
        </div>
    );
}

function TokenRow({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-0">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">{preview}</div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary font-mono">{label}</p>
                <p className="text-xs text-muted">{value}</p>
            </div>
        </div>
    );
}

function CodeBlock({ children }: { children: string }) {
    return (
        <pre className="text-xs bg-[#1a1a1a] text-[#a8ff80] p-4 rounded-card overflow-x-auto leading-relaxed custom-scrollbar">
            {children}
        </pre>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-lg font-bold text-primary border-b border-border-subtle pb-3">
            {children}
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">{children}</h3>
    );
}

// ─── Nav sections ─────────────────────────────────────────────────────────────

const SECTIONS = [
    { id: 'tokens',     label: 'Tokens' },
    { id: 'components', label: 'Componentes' },
    { id: 'new',        label: 'Novos (2025)' },
    { id: 'patterns',   label: 'Padrões' },
    { id: 'contributing', label: 'Contribuir' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystem() {
    const [toggle1, setToggle1] = useState(false);
    const [toggle2, setToggle2] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogSizeOpen, setDialogSizeOpen] = useState(false);
    const [dialogSheetOpen, setDialogSheetOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [fadeKey, setFadeKey] = useState(0);

    const inputError = inputVal.length > 0 && inputVal.length < 3 ? 'Mínimo de 3 caracteres' : undefined;

    const scrollTo = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="flex gap-8 items-start max-w-6xl mx-auto fade-in pb-16">

            {/* Sticky sidebar nav */}
            <nav aria-label="Seções do Design System" className="w-44 shrink-0 sticky top-16 pt-4 hidden lg:block">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-3 px-2">
                    Nesta Página
                </p>
                <ul className="space-y-0.5">
                    {SECTIONS.map(s => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                onClick={scrollTo(s.id)}
                                className="flex items-center px-2 py-1.5 text-sm text-secondary rounded-[var(--radius-md)] hover:bg-surface-0 hover:text-primary transition-colors"
                            >
                                {s.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-16">

                {/* Page header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Layers size={24} className="text-brand" />
                        <h1 className={typography.pageTitle}>Design System</h1>
                    </div>
                    <p className="text-sm text-secondary">
                        Referência interativa dos tokens, componentes e padrões do VTask.
                        Stack: <code className="bg-surface-0 px-1 rounded text-xs font-mono">Figtree</code> ·{' '}
                        <code className="bg-surface-0 px-1 rounded text-xs font-mono">Tailwind v4</code> ·{' '}
                        <code className="bg-surface-0 px-1 rounded text-xs font-mono">React 19</code> ·{' '}
                        <code className="bg-surface-0 px-1 rounded text-xs font-mono">Sonner</code>
                    </p>
                </div>

                {/* ════════ TOKENS */}
                <section id="tokens" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Tokens</SectionHeading>

                    {/* ── Color palette ── */}
                    <div>
                        <SubHeading>Paleta de Cores — Superfícies</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <TokenRow label="--color-surface-0"    value="#ece9e4 — células vazias, depressões, hover sutil"  preview={<div className="w-10 h-10 rounded-md bg-surface-0 border border-border-subtle" />} />
                                <TokenRow label="--color-surface-1"    value="#f5f3ef — fundo da sidebar e páginas"                preview={<div className="w-10 h-10 rounded-md bg-surface-1 border border-border-subtle" />} />
                                <TokenRow label="--color-surface-2"    value="#fafaf8 — background alternativo"                    preview={<div className="w-10 h-10 rounded-md bg-surface-2 border border-border-subtle" />} />
                                <TokenRow label="--color-surface-card" value="#ffffff — cards, modais, containers principais"      preview={<div className="w-10 h-10 rounded-md bg-surface-card border border-border-subtle" />} />
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <SubHeading>Paleta de Cores — Brand</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <TokenRow label="--color-brand"       value="#db4035 — CTAs, links ativos, indicadores urgentes"  preview={<div className="w-10 h-10 rounded-md bg-brand" />} />
                                <TokenRow label="--color-brand-light" value="#fdf3f2 — fundo de badges, hover de items ativos"    preview={<div className="w-10 h-10 rounded-md bg-brand-light border border-brand/20" />} />
                                <TokenRow label="--color-brand-dark"  value="#b8342a — hover do botão primário"                    preview={<div className="w-10 h-10 rounded-md" style={{ backgroundColor: '#b8342a' }} />} />
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <SubHeading>Paleta de Cores — Texto e Bordas</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <TokenRow label="--color-text-primary"   value="#1c1a18 — texto principal"                        preview={<div className="w-10 h-10 rounded-md flex items-center justify-center text-xl font-bold text-primary">Aa</div>} />
                                <TokenRow label="--color-text-secondary" value="#6b6860 — labels, descrições"                     preview={<div className="w-10 h-10 rounded-md flex items-center justify-center text-xl font-bold text-secondary">Aa</div>} />
                                <TokenRow label="--color-text-muted"     value="#a09d98 — placeholders, metadata"                 preview={<div className="w-10 h-10 rounded-md flex items-center justify-center text-xl font-bold text-muted">Aa</div>} />
                                <TokenRow label="--color-border-subtle"  value="#e8e5e0 — bordas de cards e divisores"            preview={<div className="w-10 h-10 rounded-md border-4 border-border-subtle" />} />
                                <TokenRow label="--color-border"         value="rgba(0,0,0,0.11) — bordas padrão"                 preview={<div className="w-10 h-10 rounded-md border-4 border-border" />} />
                                <TokenRow label="--color-border-strong"  value="rgba(0,0,0,0.18) — bordas de ênfase"             preview={<div className="w-10 h-10 rounded-md border-4 border-border-strong" />} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Chart palette ── */}
                    <div>
                        <SubHeading>CHART_PALETTE — Gráficos e Visualizações</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs text-secondary mb-4 font-mono">
                                    import {'{ CHART_PALETTE }'} from '../lib/designTokens'
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {CHART_PALETTE.map((color, i) => (
                                        <div key={color} className="flex flex-col items-center gap-1.5">
                                            <div className="w-10 h-10 rounded-card shadow-float" style={{ backgroundColor: color }} />
                                            <code className="text-[9px] font-mono text-muted">[{i}]</code>
                                        </div>
                                    ))}
                                </div>
                                <CodeBlock>{`const CHART_PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
]`}</CodeBlock>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Typography ── */}
                    <div>
                        <SubHeading>Tipografia — Escala Semântica</SubHeading>
                        <Card>
                            <CardContent className="pt-6 space-y-1">
                                <p className="text-xs text-secondary mb-4 font-mono">
                                    import {'{ typography }'} from '../lib/designTokens'
                                </p>
                                {(Object.entries(typography) as [string, string][]).map(([key, classes]) => (
                                    <div key={key} className="flex items-baseline gap-4 py-3 border-b border-border-subtle last:border-0">
                                        <div className={cn('flex-1', classes)}>
                                            {key === 'pageTitle'    && 'Título de Página'}
                                            {key === 'sectionTitle' && 'Título de Seção'}
                                            {key === 'cardTitle'    && 'Título de Card'}
                                            {key === 'body'         && 'Texto de corpo'}
                                            {key === 'label'        && 'LABEL DE CAMPO'}
                                            {key === 'micro'        && 'MICRO LABEL'}
                                        </div>
                                        <code className="text-[10px] text-muted font-mono shrink-0 hidden sm:block">
                                            typography.{key}
                                        </code>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Radius & Shadows ── */}
                    <div>
                        <SubHeading>Border Radius & Sombras</SubHeading>
                        <Card>
                            <CardContent className="pt-6 space-y-0">
                                <TokenRow label="--radius-xs"   value="4px — tags, dots"                                 preview={<div className="w-10 h-10 bg-brand rounded-[4px]" />} />
                                <TokenRow label="--radius-sm"   value="6px — badges, status pills"                       preview={<div className="w-10 h-10 bg-brand rounded-[6px]" />} />
                                <TokenRow label="--radius-md"   value="8px — buttons, inputs"                            preview={<div className="w-10 h-10 bg-brand rounded-[8px]" />} />
                                <TokenRow label="--radius-card" value="8px — cards, containers, modais"                  preview={<div className="w-10 h-10 bg-brand rounded-card" />} />
                                <TokenRow label="--radius-lg"   value="12px — bottom sheet, large containers"            preview={<div className="w-10 h-10 bg-brand rounded-[12px]" />} />
                                <TokenRow label="--radius-pill" value="9999px — pill buttons, avatars"                   preview={<div className="w-10 h-10 bg-brand rounded-full" />} />
                                <TokenRow label="shadow-float"  value="0 0 0 1px rgba(0,0,0,0.10) — popovers, dropdowns" preview={<div className="w-10 h-10 bg-surface-card rounded-card shadow-float" />} />
                                <TokenRow label="shadow-modal"  value="0 0 0 1px rgba(0,0,0,0.12) — modais"             preview={<div className="w-10 h-10 bg-surface-card rounded-card shadow-modal" />} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Modal sizes ── */}
                    <div>
                        <SubHeading>modalSizes — Larguras de Modal</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-xs text-secondary mb-4 font-mono">
                                    import {'{ modalSizes }'} from '../lib/designTokens' — use via prop{' '}
                                    <code>size</code> no Dialog
                                </p>
                                <div className="space-y-2">
                                    {(Object.entries(modalSizes) as [string, string][]).map(([key, cls]) => (
                                        <div key={key} className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0">
                                            <code className="text-xs font-mono text-brand w-12">{key}</code>
                                            <div className="flex-1 bg-surface-0 rounded-sm h-4 overflow-hidden">
                                                <div
                                                    className="h-full bg-brand/20 rounded-sm"
                                                    style={{
                                                        width: key === 'sm' ? '30%' : key === 'md' ? '42%' : key === 'lg' ? '58%' : key === 'xl' ? '72%' : '85%'
                                                    }}
                                                />
                                            </div>
                                            <code className="text-xs font-mono text-muted">{cls}</code>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Animations ── */}
                    <div>
                        <SubHeading>Animações</SubHeading>
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-4 border-b border-border-subtle pb-4">
                                    <div>
                                        <p className="text-sm font-bold text-primary">.fade-in</p>
                                        <code className="text-xs text-muted font-mono">opacity 0→1, 200ms ease-in</code>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setFadeKey(k => k + 1)}>Preview</Button>
                                    <div key={fadeKey} className="fade-in px-3 py-1 bg-brand-light text-brand text-xs rounded-full font-bold">Animado!</div>
                                </div>
                                <div className="border-b border-border-subtle pb-4">
                                    <p className="text-sm font-bold text-primary">.popup-spring</p>
                                    <code className="text-xs text-muted font-mono">scale 0.95→1 + opacity, 250ms cubic-bezier spring — modais desktop</code>
                                </div>
                                <div className="border-b border-border-subtle pb-4">
                                    <p className="text-sm font-bold text-primary">.slide-up-spring</p>
                                    <code className="text-xs text-muted font-mono">translateY 100%→0, 350ms cubic-bezier spring — bottom sheet mobile</code>
                                </div>
                                <div className="border-b border-border-subtle pb-4">
                                    <p className="text-sm font-bold text-primary">.skeleton-pulse</p>
                                    <code className="text-xs text-muted font-mono">opacity pulse, 1.5s infinite — loading skeletons</code>
                                    <div className="mt-2 flex gap-2">
                                        <div className="skeleton-pulse h-4 w-32 rounded" />
                                        <div className="skeleton-pulse h-4 w-20 rounded" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-primary">prefers-reduced-motion</p>
                                    <code className="text-xs text-muted font-mono">todas as animações desabilitadas automaticamente — não há necessidade de condicionais</code>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* ════════ COMPONENTS */}
                <section id="components" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Componentes UI</SectionHeading>

                    {/* Button */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Button</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Button.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-secondary">
                                <code>variant</code>: primary | ghost | danger &nbsp;·&nbsp;
                                <code>size</code>: sm | md | lg | icon &nbsp;·&nbsp;
                                <code>isLoading</code>?: boolean
                            </p>
                            <div className="space-y-3">
                                <SubHeading>Variantes</SubHeading>
                                <DemoBox>
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="ghost">Ghost</Button>
                                    <Button variant="danger">Danger</Button>
                                </DemoBox>
                                <SubHeading>Tamanhos</SubHeading>
                                <DemoBox className="items-end">
                                    <Button size="sm">Small</Button>
                                    <Button size="md">Medium</Button>
                                    <Button size="lg">Large</Button>
                                    <Button size="icon" aria-label="Ícone"><Layers size={18} /></Button>
                                </DemoBox>
                                <SubHeading>Estados</SubHeading>
                                <DemoBox>
                                    <Button isLoading={isLoading} onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 2000); }}>
                                        {isLoading ? 'Salvando...' : 'Testar isLoading (2s)'}
                                    </Button>
                                    <Button disabled>Disabled</Button>
                                    <Button variant="ghost" disabled>Ghost Disabled</Button>
                                </DemoBox>
                            </div>
                            <CodeBlock>{`<Button variant="primary" size="md">Salvar</Button>
<Button variant="ghost" size="sm">Cancelar</Button>
<Button variant="danger">Excluir</Button>
<Button isLoading={loading} onClick={handleSave}>Salvar</Button>
<Button size="icon" aria-label="Configurações"><Settings size={18} /></Button>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Card</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Card.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-secondary">
                                Sub-componentes: <code>Card</code> · <code>CardHeader</code> · <code>CardTitle</code> · <code>CardContent</code>
                            </p>
                            <DemoBox className="bg-surface-1">
                                <Card className="w-full max-w-sm">
                                    <CardHeader>
                                        <CardTitle>Título do Card</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-secondary">Conteúdo do card. Border-radius = radius-card.</p>
                                    </CardContent>
                                </Card>
                            </DemoBox>
                            <CodeBlock>{`<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>Conteúdo</CardContent>
</Card>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Badge */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Badge</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Badge.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DemoBox>
                                <Badge variant="admin">Admin</Badge>
                                <Badge variant="editor">Editor</Badge>
                                <Badge variant="viewer">Viewer</Badge>
                            </DemoBox>
                            <CodeBlock>{`<Badge variant="admin">Administrador</Badge>
<Badge variant="editor">Editor</Badge>
<Badge variant="viewer">Visualizador</Badge>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Input */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Input</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Input.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-secondary">Normal</label>
                                    <Input placeholder="Placeholder..." />
                                </div>
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-secondary">
                                        Com erro — <span className="text-muted font-normal">digite 1–2 chars</span>
                                    </label>
                                    <Input value={inputVal} onChange={e => setInputVal(e.target.value)} placeholder="Mínimo 3 caracteres..." error={inputError} />
                                </div>
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-muted">Disabled</label>
                                    <Input disabled placeholder="Campo desabilitado" />
                                </div>
                            </DemoBox>
                            <CodeBlock>{`<Input placeholder="Texto..." />
<Input error="Campo obrigatório" value={val} onChange={e => setVal(e.target.value)} />
<Input disabled placeholder="Desabilitado" />`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Select */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Select</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Select.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="w-full max-w-sm">
                                    <Select label="Selecione uma opção">
                                        <option value="1">Opção 1</option>
                                        <option value="2">Opção 2</option>
                                    </Select>
                                </div>
                                <div className="w-full max-w-sm">
                                    <Select label="Com erro" error="Seleção inválida">
                                        <option value="">Selecione...</option>
                                    </Select>
                                </div>
                            </DemoBox>
                            <CodeBlock>{`<Select label="Prioridade">
  <option value="low">Baixa</option>
  <option value="high">Alta</option>
</Select>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Toggle */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Toggle</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Toggle.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <Toggle checked={toggle1} onCheckedChange={setToggle1} />
                                    <span className="text-sm text-secondary">Estado: <strong className="text-primary">{toggle1 ? 'Ligado' : 'Desligado'}</strong></span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Toggle checked={toggle2} onCheckedChange={setToggle2} />
                                    <span className="text-sm text-secondary">Começa ligado</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Toggle checked={false} onCheckedChange={() => {}} disabled />
                                    <span className="text-sm text-muted">Disabled</span>
                                </div>
                            </DemoBox>
                            <CodeBlock>{`<Toggle checked={enabled} onCheckedChange={setEnabled} />`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Dialog */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Dialog</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/Dialog.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-secondary">
                                Props: <code>isOpen</code> · <code>onClose</code> · <code>title</code> ·{' '}
                                <code>size?</code>: sm | md | lg | xl | full · <code>sheet?</code>: boolean ·{' '}
                                <code>headerActions?</code>
                            </p>
                            <p className="text-xs text-muted">
                                Fecha com ESC ou clique fora. Bloqueia scroll do body. Focus trap. <code>sheet=true</code> → bottom sheet no mobile, modal no desktop.
                            </p>
                            <DemoBox>
                                <Button variant="ghost" onClick={() => setDialogOpen(true)}>Dialog (sm)</Button>
                                <Button variant="ghost" onClick={() => setDialogSizeOpen(true)}>Dialog (lg)</Button>
                                <Button variant="ghost" onClick={() => setDialogSheetOpen(true)}>Sheet (mobile)</Button>
                            </DemoBox>
                            <CodeBlock>{`// Modal simples
<Dialog isOpen={open} onClose={() => setOpen(false)} title="Título" size="sm">
  <p>Conteúdo</p>
</Dialog>

// Bottom sheet no mobile, modal no desktop
<Dialog isOpen={open} onClose={() => setOpen(false)} title="Detalhe" size="full" sheet>
  <p>Conteúdo</p>
</Dialog>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* Toaster */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Toast</CardTitle>
                            <p className="text-xs text-muted font-mono">sonner · src/components/ui/Toaster.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DemoBox>
                                <Button onClick={() => toast.success('Operação realizada com sucesso!')}>success</Button>
                                <Button variant="ghost" onClick={() => toast.error('Algo deu errado.')}>error</Button>
                                <Button variant="ghost" onClick={() => toast.info('Informação.')}>info</Button>
                                <Button variant="ghost" onClick={() => toast('Mensagem neutra.')}>default</Button>
                            </DemoBox>
                            <CodeBlock>{`import { toast } from 'sonner';

toast.success('Salvo!');
toast.error('Erro ao salvar.');
toast.info('3 tarefas pendentes.');

// Com ação de desfazer
toast.success('Movido!', {
  action: { label: 'Desfazer', onClick: handleUndo }
});`}</CodeBlock>
                        </CardContent>
                    </Card>
                </section>

                {/* ════════ NOVOS COMPONENTES */}
                <section id="new" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Novos Componentes (2025)</SectionHeading>

                    {/* EmptyState */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">EmptyState</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/EmptyState.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-secondary">
                                <code>icon</code>: LucideIcon · <code>title</code> · <code>description</code>? ·{' '}
                                <code>action</code>? · <code>variant</code>: default | bordered
                            </p>
                            <div className="space-y-3">
                                <SubHeading>variant="default" — listas e páginas inline</SubHeading>
                                <DemoBox className="flex-col">
                                    <EmptyState
                                        icon={Inbox}
                                        title="Nenhuma tarefa encontrada"
                                        description="Tente ajustar seus filtros ou crie uma nova tarefa."
                                    />
                                </DemoBox>
                                <SubHeading>variant="bordered" — container principal vazio</SubHeading>
                                <div className="h-56 flex">
                                    <EmptyState
                                        variant="bordered"
                                        icon={Folder}
                                        title="Nenhum projeto ativo"
                                        description="Crie seu primeiro projeto para começar."
                                        action={{ label: 'Criar Projeto', onClick: () => toast.info('Clicou em Criar Projeto') }}
                                    />
                                </div>
                                <SubHeading>Com action (variant="default")</SubHeading>
                                <DemoBox className="flex-col">
                                    <EmptyState
                                        icon={CheckCircle2}
                                        title="Tudo em dia!"
                                        description="Você não tem tarefas atrasadas."
                                        action={{ label: 'Ver todas as tarefas', onClick: () => toast.info('Navegar para tarefas') }}
                                    />
                                </DemoBox>
                            </div>
                            <CodeBlock>{`import { EmptyState } from '../components/ui/EmptyState';
import { Inbox } from 'lucide-react';

// Inline (listas)
<EmptyState
  icon={Inbox}
  title="Nenhuma tarefa"
  description="Crie uma nova tarefa para começar."
/>

// Container principal
<EmptyState
  variant="bordered"
  icon={Folder}
  title="Nenhum projeto"
  action={{ label: 'Criar Projeto', onClick: handleCreate }}
/>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* FormLayout */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">FormGrid · FormField · FormActions</CardTitle>
                            <p className="text-xs text-muted font-mono">src/components/ui/FormLayout.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-secondary">
                                <code>FormGrid</code>: grid de 1–3 colunas · <code>FormField</code>: label + conteúdo + error + hint ·{' '}
                                <code>FormActions</code>: rodapé com borda
                            </p>
                            <DemoBox className="flex-col items-start">
                                <div className="w-full max-w-lg space-y-4">
                                    <FormGrid cols={2}>
                                        <FormField label="Nome" required>
                                            <Input placeholder="Ex: João Silva" />
                                        </FormField>
                                        <FormField label="E-mail" error="Formato inválido">
                                            <Input type="email" placeholder="email@empresa.com" error="Formato inválido" />
                                        </FormField>
                                        <FormField label="Descrição" colSpan={2} hint="Máximo 200 caracteres">
                                            <Input placeholder="Breve descrição..." />
                                        </FormField>
                                    </FormGrid>
                                    <FormActions>
                                        <Button variant="ghost">Cancelar</Button>
                                        <Button>Salvar</Button>
                                    </FormActions>
                                </div>
                            </DemoBox>
                            <CodeBlock>{`import { FormGrid, FormField, FormActions } from '../components/ui/FormLayout';

<form onSubmit={handleSubmit} className="space-y-4">
  <FormGrid cols={2}>
    <FormField label="Nome" required error={errors.name?.message}>
      <Input {...register('name')} />
    </FormField>
    <FormField label="E-mail" hint="Usado para login">
      <Input type="email" {...register('email')} />
    </FormField>
    <FormField label="Bio" colSpan={2}>
      <textarea {...register('bio')} rows={3} />
    </FormField>
  </FormGrid>
  <FormActions>
    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
    <Button type="submit" isLoading={loading}>Salvar</Button>
  </FormActions>
</form>`}</CodeBlock>
                        </CardContent>
                    </Card>
                </section>

                {/* ════════ PATTERNS */}
                <section id="patterns" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Padrões de Uso</SectionHeading>

                    {/* Pattern: Configurações com Toggle */}
                    <div>
                        <SubHeading>Configurações com Toggle</SubHeading>
                        <Card>
                            <CardHeader><CardTitle>Notificações</CardTitle></CardHeader>
                            <CardContent className="divide-y divide-border-subtle">
                                {[
                                    { label: 'Notificações por e-mail', desc: 'Receba alertas de novas tarefas', state: toggle1, set: setToggle1 },
                                    { label: 'Resumo semanal', desc: 'Todo domingo às 08h', state: toggle2, set: setToggle2 },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium text-primary">{item.label}</p>
                                            <p className="text-xs text-muted">{item.desc}</p>
                                        </div>
                                        <Toggle checked={item.state} onCheckedChange={item.set} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pattern: Lista com ações */}
                    <div>
                        <SubHeading>Lista de Itens com Ações</SubHeading>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Membros da Equipe</CardTitle>
                                    <Badge variant="admin">Admin</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { name: 'Ana Silva', role: 'editor' as const },
                                        { name: 'Bruno Costa', role: 'viewer' as const },
                                    ].map(member => (
                                        <div key={member.name} className="flex items-center justify-between p-3 border border-border-subtle rounded-card">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-sm">
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-primary">{member.name}</p>
                                                    <Badge variant={member.role} className="mt-0.5">{member.role}</Badge>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost">Editar</Button>
                                                <Button size="sm" variant="danger">Remover</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* ════════ CONTRIBUTING */}
                <section id="contributing" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Contribuir</SectionHeading>

                    <Card>
                        <CardHeader><CardTitle>Como adicionar um novo componente</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <ol className="space-y-4 list-decimal list-inside text-sm text-secondary">
                                <li><strong className="text-primary">Crie</strong> em <code className="bg-surface-0 px-1 rounded font-mono text-xs">src/components/ui/MeuComponente.tsx</code></li>
                                <li><strong className="text-primary">Use <code className="bg-surface-0 px-1 rounded font-mono text-xs">cn()</code></strong> de <code className="bg-surface-0 px-1 rounded font-mono text-xs">../../lib/utils</code></li>
                                <li><strong className="text-primary">Use os tokens</strong> — <code className="bg-surface-0 px-1 rounded font-mono text-xs">bg-brand</code>, <code className="bg-surface-0 px-1 rounded font-mono text-xs">text-primary</code>, <code className="bg-surface-0 px-1 rounded font-mono text-xs">border-border-subtle</code></li>
                                <li><strong className="text-primary">Use constantes</strong> de <code className="bg-surface-0 px-1 rounded font-mono text-xs">src/lib/designTokens.ts</code> para typography, modalSizes e CHART_PALETTE</li>
                                <li><strong className="text-primary">Documente</strong> adicionando um Card na seção "Novos" desta página</li>
                            </ol>

                            <div className="p-4 bg-brand-light border border-brand/20 rounded-card">
                                <p className="text-xs text-brand font-semibold mb-2">Checklist antes do PR</p>
                                <ul className="text-xs text-brand/80 space-y-1 list-disc list-inside">
                                    <li>Estados documentados nesta página (default, loading, disabled, error)</li>
                                    <li>Usa tokens CSS e não cores hardcoded</li>
                                    <li>Botões de ícone têm <code>aria-label</code></li>
                                    <li><code>0</code> erros — <code>npm run lint && npm run build</code></li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>

            {/* Dialog portals */}
            <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Dialog — size sm (padrão)" size="sm">
                <p className="text-sm text-secondary mb-4">
                    Modal centralizado padrão. Fecha com ESC ou clique no overlay.
                </p>
                <FormActions>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
                </FormActions>
            </Dialog>

            <Dialog isOpen={dialogSizeOpen} onClose={() => setDialogSizeOpen(false)} title="Dialog — size lg" size="lg">
                <p className="text-sm text-secondary mb-4">
                    Modal largo. Use para formulários complexos ou conteúdo rich.
                </p>
                <FormActions>
                    <Button variant="ghost" onClick={() => setDialogSizeOpen(false)}>Fechar</Button>
                </FormActions>
            </Dialog>

            <Dialog isOpen={dialogSheetOpen} onClose={() => setDialogSheetOpen(false)} title="Dialog — sheet" size="lg" sheet>
                <p className="text-sm text-secondary mb-4">
                    Em mobile: bottom sheet com drag handle, slide-up-spring e max-h 85vh.<br />
                    Em desktop: modal centralizado normal.
                </p>
                <FormActions>
                    <Button variant="ghost" onClick={() => setDialogSheetOpen(false)}>Fechar</Button>
                </FormActions>
            </Dialog>
        </div>
    );
}
