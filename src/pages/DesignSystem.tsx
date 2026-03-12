import * as React from 'react';
import { useState } from 'react';
import { Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { Dialog } from '../components/ui/Dialog';
import { Select } from '../components/ui/Select';

// ─── Inline helpers ───────────────────────────────────────────────────────────

function DemoBox({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('p-6 bg-bg-main rounded-xl border border-border-subtle flex flex-wrap gap-3 items-center', className)}>
            {children}
        </div>
    );
}

function TokenRow({ label, value, preview }: { label: string; value: string; preview?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 py-3 border-b border-border-subtle last:border-0">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">{preview}</div>
            <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{label}</p>
                <code className="text-xs text-gray-500 font-mono">{value}</code>
            </div>
        </div>
    );
}

function CodeBlock({ children }: { children: string }) {
    return (
        <pre className="text-xs bg-gray-900 text-green-300 p-4 rounded-xl overflow-x-auto leading-relaxed">
            {children}
        </pre>
    );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="text-lg font-bold text-gray-900 border-b border-border-subtle pb-3">
            {children}
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{children}</h3>
    );
}

// ─── Sections config ──────────────────────────────────────────────────────────

const SECTIONS = [
    { id: 'tokens', label: 'Tokens' },
    { id: 'components', label: 'Componentes' },
    { id: 'patterns', label: 'Padrões de Uso' },
    { id: 'contributing', label: 'Contribuir' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystem() {
    const [toggle1, setToggle1] = useState(false);
    const [toggle2, setToggle2] = useState(true);
    const [toggleDisabled] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogWideOpen, setDialogWideOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inputVal, setInputVal] = useState('');
    const [fadeKey, setFadeKey] = useState(0);

    const inputError = inputVal.length > 0 && inputVal.length < 3 ? 'Mínimo de 3 caracteres' : undefined;

    const handleLoadingDemo = () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    const scrollTo = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="flex gap-8 items-start max-w-6xl mx-auto fade-in pb-16">

            {/* ── Sticky sidebar nav ── */}
            <nav className="w-44 shrink-0 sticky top-16 pt-4 hidden lg:block">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">
                    Nesta Página
                </p>
                <ul className="space-y-0.5">
                    {SECTIONS.map(s => (
                        <li key={s.id}>
                            <a
                                href={`#${s.id}`}
                                onClick={scrollTo(s.id)}
                                className="flex items-center px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                {s.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0 space-y-16">

                {/* Page header */}
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Layers size={24} className="text-brand" />
                        <h1 className="text-2xl font-bold text-gray-900">Design System</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Referência interativa dos tokens, componentes e padrões do FlowDesk.
                        Stack: <code className="bg-gray-100 px-1 rounded text-xs">Figtree</code> ·{' '}
                        <code className="bg-gray-100 px-1 rounded text-xs">Tailwind v4</code> ·{' '}
                        <code className="bg-gray-100 px-1 rounded text-xs">React 19</code> ·{' '}
                        <code className="bg-gray-100 px-1 rounded text-xs">Sonner</code>
                    </p>
                </div>

                {/* ════════════════════════════════════ TOKENS */}
                <section id="tokens" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Tokens</SectionHeading>

                    {/* Colors */}
                    <div>
                        <SubHeading>Cores</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <TokenRow
                                    label="--color-brand"
                                    value="#db4035 — Vermelho principal, CTAs, links ativos"
                                    preview={<div className="w-10 h-10 rounded-md bg-brand" />}
                                />
                                <TokenRow
                                    label="--color-brand-light"
                                    value="#fdf3f2 — Fundo de itens ativos, badges admin"
                                    preview={<div className="w-10 h-10 rounded-md bg-brand-light border border-border-subtle" />}
                                />
                                <TokenRow
                                    label="--color-bg-main"
                                    value="#fafaf8 — Background principal das páginas"
                                    preview={<div className="w-10 h-10 rounded-md bg-bg-main border border-border-subtle" />}
                                />
                                <TokenRow
                                    label="--color-bg-sidebar"
                                    value="#f5f3ef — Background da sidebar e painéis laterais"
                                    preview={<div className="w-10 h-10 rounded-md bg-bg-sidebar border border-border-subtle" />}
                                />
                                <TokenRow
                                    label="--color-border-subtle"
                                    value="#e8e5e0 — Bordas de cards, divisores, inputs"
                                    preview={<div className="w-10 h-10 rounded-md border-4 border-border-subtle bg-white" />}
                                />
                                <TokenRow
                                    label="Body text"
                                    value="#1a1a1a — Texto principal do corpo"
                                    preview={<div className="w-10 h-10 rounded-md" style={{ backgroundColor: '#1a1a1a' }} />}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Typography */}
                    <div>
                        <SubHeading>Tipografia — Figtree</SubHeading>
                        <Card>
                            <CardContent className="pt-6 space-y-5">
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-2xl font-bold text-gray-900 flex-1">Título de Página</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-2xl font-bold</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-lg font-bold text-gray-900 flex-1">Título de Seção</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-lg font-bold</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-base font-semibold text-gray-900 flex-1">Subtítulo / Card Title</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-base font-semibold</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-sm font-medium text-gray-700 flex-1">Texto de corpo / Labels</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-sm font-medium</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-sm text-gray-500 flex-1">Texto secundário / Descrições</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-sm text-gray-500</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2 border-b border-border-subtle">
                                    <p className="text-xs text-gray-500 flex-1">Caption / Metadata</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-xs text-gray-500</code>
                                </div>
                                <div className="flex items-baseline gap-4 py-2">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-1">LABEL DE SEÇÃO</p>
                                    <code className="text-xs text-gray-400 font-mono shrink-0">text-[11px] uppercase tracking-widest</code>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Spacing */}
                    <div>
                        <SubHeading>Espaçamento (escala Tailwind usada no projeto)</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-end gap-6 flex-wrap">
                                    {[
                                        { n: 2, label: 'p-2', px: 8 },
                                        { n: 3, label: 'p-3', px: 12 },
                                        { n: 4, label: 'p-4', px: 16 },
                                        { n: 6, label: 'p-6', px: 24 },
                                        { n: 8, label: 'p-8', px: 32 },
                                    ].map(({ label, px }) => (
                                        <div key={label} className="flex flex-col items-center gap-2">
                                            <div
                                                className="bg-brand/20 border border-brand/40 rounded-md"
                                                style={{ width: `${px}px`, height: `${px}px` }}
                                            />
                                            <code className="text-[10px] text-gray-500">{label}</code>
                                            <span className="text-[10px] text-gray-400">{px}px</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Radius + Animations */}
                    <div>
                        <SubHeading>Border Radius & Animações</SubHeading>
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <TokenRow
                                    label="--radius-card"
                                    value="12px — Cards, modais, caixas de conteúdo"
                                    preview={<div className="w-10 h-10 bg-brand rounded-[12px]" />}
                                />
                                <TokenRow
                                    label="rounded-full"
                                    value="9999px — Badges, avatares, pills"
                                    preview={<div className="w-10 h-10 bg-brand-light border-2 border-brand rounded-full" />}
                                />
                                <div className="flex items-center gap-4 pt-2">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">.fade-in</p>
                                        <code className="text-xs text-gray-500 font-mono">opacity 0→1, 150ms ease-in-out</code>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => setFadeKey(k => k + 1)}>
                                        Preview
                                    </Button>
                                    <div key={fadeKey} className="fade-in px-3 py-1 bg-brand-light text-brand text-xs rounded-full font-bold">
                                        Animado!
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border-subtle">
                                    <p className="text-sm font-bold text-gray-900">.slide-up-spring</p>
                                    <code className="text-xs text-gray-500 font-mono">translateY 100%→0, 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)</code>
                                    <p className="text-xs text-gray-400 mt-1">Usado em modais e overlays de entrada.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* ════════════════════════════════════ COMPONENTS */}
                <section id="components" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Componentes UI</SectionHeading>

                    {/* ── Button ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Button</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Button.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                <code>variant</code>: primary | ghost | danger &nbsp;·&nbsp;
                                <code>size</code>: sm | md | lg | icon &nbsp;·&nbsp;
                                <code>isLoading</code>?: boolean
                            </p>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Variantes</p>
                                <DemoBox>
                                    <Button variant="primary">Primary</Button>
                                    <Button variant="ghost">Ghost</Button>
                                    <Button variant="danger">Danger</Button>
                                </DemoBox>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tamanhos</p>
                                <DemoBox className="items-end">
                                    <Button size="sm">Small</Button>
                                    <Button size="md">Medium</Button>
                                    <Button size="lg">Large</Button>
                                    <Button size="icon"><Layers size={18} /></Button>
                                </DemoBox>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Estados</p>
                                <DemoBox>
                                    <Button isLoading={isLoading} onClick={handleLoadingDemo}>
                                        {isLoading ? 'Carregando...' : 'Testar isLoading (2s)'}
                                    </Button>
                                    <Button disabled>Disabled</Button>
                                </DemoBox>
                            </div>
                            <CodeBlock>{`<Button variant="primary" size="md">Label</Button>
<Button variant="ghost" size="sm">Cancelar</Button>
<Button isLoading={loading} onClick={handleSave}>Salvar</Button>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── Card ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Card</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Card.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Sub-componentes: <code>Card</code> · <code>CardHeader</code> · <code>CardTitle</code> · <code>CardContent</code>
                            </p>
                            <DemoBox className="bg-bg-sidebar">
                                <Card className="w-full max-w-sm">
                                    <CardHeader>
                                        <CardTitle>Título do Card</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-600">Conteúdo do card aqui. Borda radius-card (12px).</p>
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

                    {/* ── Badge ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Badge</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Badge.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                <code>variant</code>: admin | editor | viewer (default)
                            </p>
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

                    {/* ── Input ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Input</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Input.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Estende <code>InputHTMLAttributes</code> · prop extra: <code>error</code>?: string
                            </p>
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Normal</label>
                                    <Input placeholder="Placeholder..." />
                                </div>
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-gray-700">
                                        Com erro ao vivo — <span className="text-gray-400 font-normal">digite 1-2 chars</span>
                                    </label>
                                    <Input
                                        value={inputVal}
                                        onChange={e => setInputVal(e.target.value)}
                                        placeholder="Mínimo 3 caracteres..."
                                        error={inputError}
                                    />
                                </div>
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-sm font-medium text-gray-400">Disabled</label>
                                    <Input disabled placeholder="Campo desabilitado" />
                                </div>
                            </DemoBox>
                            <CodeBlock>{`<Input placeholder="Texto..." />
<Input error="Campo obrigatório" value={val} onChange={e => setVal(e.target.value)} />
<Input disabled placeholder="Desabilitado" />`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── Select ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Select</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Select.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Estende <code>SelectHTMLAttributes</code> · props extras: <code>label</code> e <code>error</code>
                            </p>
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="w-full max-w-sm">
                                    <Select label="Selecione uma opção">
                                        <option value="1">Opção 1</option>
                                        <option value="2">Opção 2</option>
                                        <option value="3">Opção 3</option>
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

                    {/* ── Date Input ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Date Input</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">Usa o componente Input com type="date"</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Estilização do seletor nativo para manter consistência com o tema off-white.
                            </p>
                            <DemoBox>
                                <div className="w-full max-w-sm space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prazo</label>
                                    <Input type="date" className="cursor-pointer" />
                                </div>
                            </DemoBox>
                            <CodeBlock>{`<Input type="date" label="Vencimento" />`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── Toggle ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Toggle</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Toggle.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Props: <code>checked</code>: boolean · <code>onCheckedChange</code>: (checked: boolean) {'=>'} void
                            </p>
                            <DemoBox className="flex-col items-start gap-4">
                                <div className="flex items-center gap-3">
                                    <Toggle checked={toggle1} onCheckedChange={setToggle1} />
                                    <span className="text-sm text-gray-700">
                                        Estado: <strong>{toggle1 ? 'Ligado' : 'Desligado'}</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Toggle checked={toggle2} onCheckedChange={setToggle2} />
                                    <span className="text-sm text-gray-700">Começa ligado</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Toggle checked={toggleDisabled} onCheckedChange={() => {}} disabled />
                                    <span className="text-sm text-gray-400">Disabled</span>
                                </div>
                            </DemoBox>
                            <CodeBlock>{`const [enabled, setEnabled] = useState(false);

<Toggle checked={enabled} onCheckedChange={setEnabled} />`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── Dialog ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Dialog</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Dialog.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Props: <code>isOpen</code> · <code>onClose</code> · <code>title</code> · <code>children</code> · <code>maxWidth</code>?: string (default: max-w-md)
                            </p>
                            <p className="text-xs text-gray-400">
                                Fecha com ESC ou clique fora. Bloqueia scroll do body. Acessível (role="dialog", aria-modal).
                            </p>
                            <DemoBox>
                                <Button variant="ghost" onClick={() => setDialogOpen(true)}>
                                    Abrir Dialog (md)
                                </Button>
                                <Button variant="ghost" onClick={() => setDialogWideOpen(true)}>
                                    Abrir Dialog Largo (2xl)
                                </Button>
                            </DemoBox>
                            <CodeBlock>{`const [open, setOpen] = useState(false);

<Button onClick={() => setOpen(true)}>Abrir</Button>

<Dialog isOpen={open} onClose={() => setOpen(false)} title="Título">
  <p>Conteúdo do modal.</p>
  <div className="flex gap-2 justify-end mt-4">
    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
    <Button onClick={handleConfirm}>Confirmar</Button>
  </div>
</Dialog>`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── CommandPalette ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">CommandPalette</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/CommandPalette.tsx</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                Gerencia estado interno. Montado globalmente em <code>App.tsx</code>.
                                Abre com{' '}
                                <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">Ctrl</kbd> +{' '}
                                <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">K</kbd> /{' '}
                                <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">Cmd</kbd> +{' '}
                                <kbd className="bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-xs font-mono">K</kbd>
                            </p>
                            <DemoBox>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        document.dispatchEvent(
                                            new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
                                        );
                                    }}
                                >
                                    Abrir Command Palette
                                </Button>
                            </DemoBox>
                            <CodeBlock>{`// Já montado em App.tsx — não instanciar novamente
// Para abrir programaticamente:
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))`}</CodeBlock>
                        </CardContent>
                    </Card>

                    {/* ── Toaster ── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Toaster / Toast</CardTitle>
                            <p className="text-xs text-gray-500 font-mono">src/components/ui/Toaster.tsx · sonner</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-gray-500">
                                O <code>{'<Toaster />'}</code> está montado globalmente em <code>App.tsx</code>.
                                Para disparar notificações, importe <code>toast</code> de <code>sonner</code>.
                            </p>
                            <DemoBox>
                                <Button onClick={() => toast.success('Operação realizada com sucesso!')}>
                                    toast.success
                                </Button>
                                <Button variant="ghost" onClick={() => toast.error('Algo deu errado. Tente novamente.')}>
                                    toast.error
                                </Button>
                                <Button variant="ghost" onClick={() => toast.info('Informação para o usuário.')}>
                                    toast.info
                                </Button>
                            </DemoBox>
                            <CodeBlock>{`import { toast } from 'sonner';

toast.success('Salvo com sucesso!');
toast.error('Erro ao salvar. Tente novamente.');
toast.info('3 tarefas pendentes para hoje.');`}</CodeBlock>
                        </CardContent>
                    </Card>
                </section>

                {/* ════════════════════════════════════ PATTERNS */}
                <section id="patterns" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Padrões de Uso</SectionHeading>

                    {/* Pattern 1: Form */}
                    <div>
                        <SubHeading>Formulário com validação</SubHeading>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="max-w-sm space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Nome</label>
                                        <Input placeholder="Nome completo" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">E-mail</label>
                                        <Input type="email" placeholder="email@empresa.com" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button className="flex-1">Salvar</Button>
                                        <Button variant="ghost">Cancelar</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pattern 2: List with actions */}
                    <div>
                        <SubHeading>Lista de itens com ações</SubHeading>
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
                                        <div
                                            key={member.name}
                                            className="flex items-center justify-between p-3 border border-border-subtle rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center text-brand font-bold text-sm">
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{member.name}</p>
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

                    {/* Pattern 3: Settings with Toggle */}
                    <div>
                        <SubHeading>Configurações com Toggle</SubHeading>
                        <Card>
                            <CardHeader>
                                <CardTitle>Notificações</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y divide-border-subtle">
                                {[
                                    { label: 'Notificações por e-mail', desc: 'Receba alertas de novas tarefas', state: toggle1, set: setToggle1 },
                                    { label: 'Resumo semanal', desc: 'Todo domingo, às 08h', state: toggle2, set: setToggle2 },
                                ].map(item => (
                                    <div key={item.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                                            <p className="text-xs text-gray-500">{item.desc}</p>
                                        </div>
                                        <Toggle checked={item.state} onCheckedChange={item.set} />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* ════════════════════════════════════ CONTRIBUTING */}
                <section id="contributing" className="scroll-mt-20 space-y-8">
                    <SectionHeading>Contribuir</SectionHeading>

                    <Card>
                        <CardHeader>
                            <CardTitle>Como adicionar um novo componente</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <ol className="space-y-4 list-decimal list-inside text-sm text-gray-700">
                                <li>
                                    <strong>Crie o arquivo</strong> em{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">src/components/ui/MeuComponente.tsx</code>
                                </li>
                                <li>
                                    <strong>Use <code className="bg-gray-100 px-1 rounded font-mono text-xs">forwardRef</code></strong> e estenda
                                    o elemento HTML nativo quando possível (ex: <code className="bg-gray-100 px-1 rounded font-mono text-xs">HTMLButtonElement</code>).
                                </li>
                                <li>
                                    <strong>Utilize <code className="bg-gray-100 px-1 rounded font-mono text-xs">cn()</code></strong> de{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">../../lib/utils</code> para mesclar classes condicionalmente.
                                </li>
                                <li>
                                    <strong>Exporte uma interface tipada</strong> (ex:{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">MeuComponenteProps</code>) antes do componente.
                                </li>
                                <li>
                                    <strong>Use os tokens do design system</strong> —{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">bg-brand</code>,{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">border-border-subtle</code>,{' '}
                                    <code className="bg-gray-100 px-1 rounded font-mono text-xs">rounded-[var(--radius-card)]</code>, etc.
                                </li>
                                <li>
                                    <strong>Documente</strong> adicionando um Card na seção Componentes desta página.
                                </li>
                            </ol>

                            <CodeBlock>{`// src/components/ui/MeuComponente.tsx
import * as React from 'react';
import { cn } from '../../lib/utils';

export interface MeuComponenteProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'outline';
}

export function MeuComponente({
    className,
    variant = 'default',
    ...props
}: MeuComponenteProps) {
    return (
        <div
            className={cn(
                'rounded-[var(--radius-card)] border border-border-subtle',
                variant === 'outline' && 'bg-transparent',
                variant === 'default' && 'bg-white',
                className
            )}
            {...props}
        />
    );
}`}</CodeBlock>

                            <div className="p-4 bg-brand-light border border-red-200 rounded-xl">
                                <p className="text-xs text-brand font-semibold mb-1">Checklist antes do PR</p>
                                <ul className="text-xs text-brand/80 space-y-1 list-disc list-inside">
                                    <li>Variantes e estados documentados nesta página</li>
                                    <li>Demo interativo funcionando</li>
                                    <li>Compatível com Tailwind v4 (sem tailwind.config.ts)</li>
                                    <li>0 erros ESLint — <code>npm run lint</code></li>
                                    <li>Build limpo — <code>npm run build</code></li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </section>

            </div>

            {/* ── Dialog portals ── */}
            <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} title="Exemplo de Dialog">
                <p className="text-sm text-gray-600 mb-4">
                    Este é o corpo do dialog. Pode conter formulários, informações ou confirmações de ação.
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={() => setDialogOpen(false)}>Confirmar</Button>
                </div>
            </Dialog>
            <Dialog
                isOpen={dialogWideOpen}
                onClose={() => setDialogWideOpen(false)}
                title="Dialog Largo (max-w-2xl)"
                maxWidth="max-w-2xl"
            >
                <p className="text-sm text-gray-600 mb-4">
                    Útil para formulários complexos, listas longas ou detalhes de itens.
                    Use a prop <code className="bg-gray-100 px-1 rounded text-xs">maxWidth</code> para controlar a largura.
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setDialogWideOpen(false)}>Fechar</Button>
                </div>
            </Dialog>
        </div>
    );
}
