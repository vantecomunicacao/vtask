import { useState } from 'react';
import {
    LayoutDashboard, CheckCircle, Folder, FileText, Mail, Calendar,
    Settings, Trash2, BookOpen, ChevronDown, ChevronRight,
    Keyboard, Kanban, List, Filter, Star, Clock, AlertCircle,
    UserCircle, Palette, Zap, Send, Archive, Search, PlusCircle,
    MousePointer, ToggleLeft, ArrowRight,
} from 'lucide-react';

interface Section {
    id: string;
    icon: React.ReactNode;
    title: string;
    color: string;
    summary: string;
    content: React.ReactNode;
}

function AccordionItem({ section }: { section: Section }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`rounded-card border border-border-subtle overflow-hidden transition-shadow ${open ? 'shadow-sm' : ''}`}>
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-6 py-4 text-left bg-surface-card hover:bg-surface-0 transition-colors"
            >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.color}`}>
                    {section.icon}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary text-sm">{section.title}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">{section.summary}</p>
                </div>
                {open
                    ? <ChevronDown size={16} className="text-muted shrink-0" />
                    : <ChevronRight size={16} className="text-muted shrink-0" />
                }
            </button>
            {open && (
                <div className="px-6 pb-6 pt-2 bg-surface-card border-t border-border-subtle">
                    {section.content}
                </div>
            )}
        </div>
    );
}

function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block bg-brand/10 text-brand text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {children}
        </span>
    );
}

function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-border-subtle bg-surface-2 text-[11px] font-mono text-primary">
            {children}
        </kbd>
    );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 items-start">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {number}
            </span>
            <p className="text-sm text-secondary leading-relaxed">{children}</p>
        </div>
    );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex gap-3 items-start py-2 border-b border-border-subtle last:border-0">
            <span className="text-brand mt-0.5 shrink-0">{icon}</span>
            <div>
                <p className="text-sm font-medium text-primary">{title}</p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
            </div>
        </div>
    );
}

const sections: Section[] = [
    {
        id: 'dashboard',
        icon: <LayoutDashboard size={18} className="text-white" />,
        color: 'bg-blue-500',
        title: 'Dashboard',
        summary: 'Visão geral do dia — tarefas atrasadas, de hoje e próximas.',
        content: (
            <div className="space-y-4 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    O Dashboard é a tela inicial após o login. Ele apresenta um resumo personalizado do que precisa de atenção agora.
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-800">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Atrasadas</p>
                        <p className="text-xs text-secondary mt-1">Tarefas com prazo vencido que precisam de atenção imediata.</p>
                    </div>
                    <div className="bg-brand/5 rounded-lg p-3 border border-brand/20">
                        <p className="text-xs font-bold text-brand uppercase tracking-wide">Para hoje</p>
                        <p className="text-xs text-secondary mt-1">Tarefas com prazo para o dia de hoje.</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Próximas</p>
                        <p className="text-xs text-secondary mt-1">Tarefas agendadas para os próximos dias.</p>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3 border border-border-subtle">
                        <p className="text-xs font-bold text-primary uppercase tracking-wide">Projetos ativos</p>
                        <p className="text-xs text-secondary mt-1">Contagem de projetos em andamento no workspace.</p>
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold text-primary mb-2">Gráfico de conclusão</p>
                    <p className="text-sm text-secondary">O gráfico de rosca mostra a distribuição de tarefas concluídas por projeto, facilitando ver onde está concentrado o trabalho finalizado.</p>
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary mb-1">Dica</p>
                    <p className="text-xs text-secondary">Clique em qualquer tarefa listada para abrir o modal de detalhes e editar diretamente.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'tarefas',
        icon: <CheckCircle size={18} className="text-white" />,
        color: 'bg-brand',
        title: 'Minhas Tarefas',
        summary: 'Lista completa com filtros, agrupamento, ordenação e atalhos de teclado.',
        content: (
            <div className="space-y-5 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    A página de Tarefas é o centro de controle individual. Mostra todas as tarefas do workspace com ferramentas avançadas de organização.
                </p>

                <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Filtros disponíveis</p>
                    <div className="space-y-1">
                        <FeatureRow icon={<Filter size={14} />} title="Por projeto" desc="Filtra tarefas de um projeto específico." />
                        <FeatureRow icon={<UserCircle size={14} />} title="Por responsável" desc="Mostra apenas tarefas atribuídas a um membro." />
                        <FeatureRow icon={<Star size={14} />} title="Por categoria" desc="Filtra por tipo de tarefa (ex: Design, Tráfego Pago)." />
                        <FeatureRow icon={<CheckCircle size={14} />} title="Concluídas" desc="Alterna entre mostrar ou ocultar tarefas finalizadas." />
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Agrupamento</p>
                    <div className="space-y-1">
                        <FeatureRow icon={<List size={14} />} title="Por status" desc="Agrupa tarefas pelas etapas do fluxo (A fazer, Em andamento, Entregue...)." />
                        <FeatureRow icon={<Clock size={14} />} title="Por data" desc="Agrupa em: Atrasadas, Hoje, Amanhã, Próximas." />
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Atalhos de teclado</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-secondary">
                        {[
                            ['N', 'Nova tarefa'],
                            ['/', 'Focar busca'],
                            ['↑ ↓', 'Navegar entre tarefas'],
                            ['Enter', 'Abrir tarefa'],
                            ['Space', 'Mudar status'],
                            ['1–9', 'Status direto'],
                            ['?', 'Ver todos os atalhos'],
                        ].map(([key, desc]) => (
                            <div key={key} className="flex items-center gap-2">
                                <Kbd>{key}</Kbd>
                                <span>{desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Ações em lote</p>
                    <p className="text-sm text-secondary">Marque a caixa de seleção em uma ou mais tarefas para exibir a barra de ações em lote — permite <strong>concluir todas</strong> ou <strong>mover para lixeira</strong> de uma vez.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'projetos',
        icon: <Folder size={18} className="text-white" />,
        color: 'bg-orange-500',
        title: 'Projetos',
        summary: 'Gerencie todos os projetos do workspace com Kanban, lista e documentos.',
        content: (
            <div className="space-y-5 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    Na página de Projetos você visualiza todos os projetos do workspace. Ao abrir um projeto, três abas ficam disponíveis:
                </p>

                <div className="space-y-3">
                    <div className="rounded-lg border border-border-subtle p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Kanban size={15} className="text-brand" />
                            <p className="text-sm font-semibold text-primary">Kanban</p>
                            <Tag>Padrão</Tag>
                        </div>
                        <p className="text-xs text-secondary">Visualização em colunas por status. Arraste e solte tarefas entre colunas para mudar o status. Cada card mostra categoria, prazo, recorrência e quantidade de comentários.</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <List size={15} className="text-brand" />
                            <p className="text-sm font-semibold text-primary">Lista</p>
                        </div>
                        <p className="text-xs text-secondary">Visualização em tabela com colunas: Tarefa, Status, Prazo e Prioridade. Ideal para rápida leitura sequencial.</p>
                    </div>
                    <div className="rounded-lg border border-border-subtle p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={15} className="text-brand" />
                            <p className="text-sm font-semibold text-primary">Documentos</p>
                        </div>
                        <p className="text-xs text-secondary">Documentos vinculados ao projeto. Crie briefings, atas, referências — tudo organizado dentro do contexto do projeto.</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Como criar um projeto</p>
                    <div className="space-y-2">
                        <Step number={1}>Clique em <strong>+ Novo Projeto</strong> na página Projetos.</Step>
                        <Step number={2}>Preencha nome, cliente, cor e status do projeto.</Step>
                        <Step number={3}>O projeto aparece no painel lateral esquerdo para acesso rápido.</Step>
                    </div>
                </div>
            </div>
        ),
    },
    {
        id: 'documentos',
        icon: <FileText size={18} className="text-white" />,
        color: 'bg-violet-500',
        title: 'Documentos',
        summary: 'Editor de texto rico com estrutura hierárquica em árvore.',
        content: (
            <div className="space-y-4 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    A seção de Documentos é um editor de texto completo para criar e organizar conteúdo interno — briefings, atas, manuais, processos.
                </p>
                <div className="space-y-1">
                    <FeatureRow icon={<FileText size={14} />} title="Hierarquia em árvore" desc="Crie documentos-pai e subdocumentos aninhados com quantos níveis quiser." />
                    <FeatureRow icon={<MousePointer size={14} />} title="Arrastar e soltar" desc="Reorganize a árvore de documentos arrastando pelo ícone de alça." />
                    <FeatureRow icon={<PlusCircle size={14} />} title="Criar filho" desc="Passe o mouse sobre um documento e clique no + para criar um subdocumento." />
                    <FeatureRow icon={<Search size={14} />} title="Busca" desc="Pesquise documentos pelo título diretamente no painel lateral." />
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary mb-1">Formatação disponível</p>
                    <p className="text-xs text-secondary">Títulos (H1–H3), negrito, itálico, listas, links, blocos de código, citações e mais — usando a barra de ferramentas do editor.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'email',
        icon: <Mail size={18} className="text-white" />,
        color: 'bg-teal-500',
        title: 'Gerador de E-mails',
        summary: 'Crie e envie campanhas de e-mail com IA integrada ao Mailchimp.',
        content: (
            <div className="space-y-5 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    O Gerador de E-mails permite criar campanhas profissionais em minutos usando inteligência artificial, com envio direto via Mailchimp.
                </p>

                <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Fluxo de criação</p>
                    <div className="space-y-2">
                        <Step number={1}>Selecione ou crie um <strong>perfil de e-mail</strong> (conta + branding da marca).</Step>
                        <Step number={2}>Escreva um prompt descrevendo o objetivo do e-mail no campo de <strong>IA</strong> e clique em GERAR.</Step>
                        <Step number={3}>Personalize o <strong>design</strong>: template, cores, logo, imagens e botão de ação.</Step>
                        <Step number={4}>Revise o e-mail no painel de <strong>preview</strong>. Use o botão EDITAR para ajustes diretos no HTML.</Step>
                        <Step number={5}>Configure o <strong>envio</strong>: assunto, texto de preview, lista Mailchimp e agendamento (opcional).</Step>
                        <Step number={6}>Clique em <strong>EXPORTAR CAMPANHA</strong> para enviar ao Mailchimp.</Step>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Recursos do painel lateral</p>
                    <FeatureRow icon={<UserCircle size={14} />} title="Perfis" desc="Gerencie múltiplas contas com identidades visuais diferentes (logo, cores, integração Mailchimp)." />
                    <FeatureRow icon={<Zap size={14} />} title="IA" desc="Geração automática de assunto e corpo do e-mail a partir de um prompt em linguagem natural." />
                    <FeatureRow icon={<Palette size={14} />} title="Design" desc="5 templates disponíveis: Newsletter, Promoção, Comunicado, Boas-vindas, Alerta." />
                    <FeatureRow icon={<Send size={14} />} title="Envio" desc="Configure assunto, preview text, lista e agendamento de envio." />
                    <FeatureRow icon={<Archive size={14} />} title="Rascunhos" desc="Salve e recupere e-mails em progresso para continuar depois." />
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Requisito</p>
                    <p className="text-xs text-secondary">É necessário configurar uma chave da API OpenAI em <strong>Configurações → Geral</strong> para usar a geração por IA.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'agenda',
        icon: <Calendar size={18} className="text-white" />,
        color: 'bg-sky-500',
        title: 'Agenda',
        summary: 'Visualização mensal das tarefas em formato de calendário.',
        content: (
            <div className="space-y-4 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    A Agenda exibe um calendário mensal onde você pode visualizar e criar tarefas diretamente nas datas.
                </p>
                <div className="space-y-1">
                    <FeatureRow icon={<ArrowRight size={14} />} title="Navegação" desc="Use os botões de seta para navegar entre meses, ou clique em 'Hoje' para voltar ao mês atual." />
                    <FeatureRow icon={<PlusCircle size={14} />} title="Criar tarefa na data" desc="Passe o mouse sobre um dia e clique no + para criar uma tarefa com aquela data de prazo." />
                    <FeatureRow icon={<Clock size={14} />} title="Hoje destacado" desc="O dia atual aparece destacado na cor principal da marca." />
                </div>
                <div className="bg-surface-2 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary mb-1">Em breve</p>
                    <p className="text-xs text-secondary">Integração com Google Calendar e visualização completa das tarefas no calendário estão planejadas.</p>
                </div>
            </div>
        ),
    },
    {
        id: 'configuracoes',
        icon: <Settings size={18} className="text-white" />,
        color: 'bg-gray-500',
        title: 'Configurações',
        summary: 'Workspace, equipe, fluxos de status, categorias e aparência.',
        content: (
            <div className="space-y-4 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    As configurações controlam o comportamento global do workspace. Divididas em cinco abas:
                </p>
                <div className="space-y-2">
                    {[
                        { tab: 'Geral', desc: 'Edite o nome do workspace e configure a chave de API da OpenAI para habilitar a geração de e-mails com IA.' },
                        { tab: 'Equipe', desc: 'Visualize os membros do workspace e seus papéis (admin / membro). O convite de novos membros está em desenvolvimento.' },
                        { tab: 'Fluxo', desc: 'Crie, edite, reordene e delete os status do fluxo de trabalho (ex: A fazer, Em andamento, Revisão, Entregue). Cada status tem cor personalizada.' },
                        { tab: 'Categorias', desc: 'Gerencie as categorias de tarefas usadas como tags (ex: Tráfego Pago, Design, Reunião). Úteis para filtrar e organizar tarefas.' },
                        { tab: 'Aparência', desc: 'Alterne entre modo claro e escuro, e escolha a cor principal do sistema entre os temas disponíveis.' },
                    ].map(({ tab, desc }) => (
                        <div key={tab} className="rounded-lg border border-border-subtle p-3">
                            <p className="text-xs font-bold text-primary mb-1">{tab}</p>
                            <p className="text-xs text-secondary">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: 'lixeira',
        icon: <Trash2 size={18} className="text-white" />,
        color: 'bg-red-500',
        title: 'Lixeira',
        summary: 'Recupere ou exclua permanentemente tarefas e documentos deletados.',
        content: (
            <div className="space-y-4 mt-2">
                <p className="text-sm text-secondary leading-relaxed">
                    Ao deletar uma tarefa ou documento, ele vai para a Lixeira — não é removido imediatamente do banco. Isso permite desfazer exclusões acidentais.
                </p>
                <div className="space-y-1">
                    <FeatureRow icon={<ToggleLeft size={14} />} title="Abas separadas" desc="Alterne entre Tarefas e Documentos na lixeira, com contadores em cada aba." />
                    <FeatureRow icon={<ArrowRight size={14} />} title="Restaurar" desc="Clique no ícone de restauração para devolver o item ao seu local original." />
                    <FeatureRow icon={<Trash2 size={14} />} title="Excluir permanentemente" desc="Remove o item do banco de dados sem possibilidade de recuperação." />
                    <FeatureRow icon={<AlertCircle size={14} />} title="Esvaziar lixeira" desc="Remove todos os itens de uma vez. Ação irreversível — pedirá confirmação." />
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-600 mb-1">Atenção</p>
                    <p className="text-xs text-secondary">Itens na lixeira ficam ocultos em todo o sistema — não aparecem no Kanban, nas listas nem no Dashboard.</p>
                </div>
            </div>
        ),
    },
];

export default function Documentacao() {
    return (
        <div className="max-w-3xl mx-auto space-y-8 fade-in">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-card bg-brand flex items-center justify-center shrink-0">
                    <BookOpen size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-primary">Documentação</h1>
                    <p className="text-sm text-muted mt-1">
                        Guia completo de todas as funcionalidades do VTask para o usuário final.
                    </p>
                </div>
            </div>

            {/* Intro card */}
            <div className="rounded-card bg-brand/5 border border-brand/20 p-5">
                <p className="text-sm text-secondary leading-relaxed">
                    O <strong className="text-primary">VTask</strong> é uma plataforma de gestão de tarefas e comunicação para agências.
                    Centralize projetos, tarefas, documentos e campanhas de e-mail em um único lugar,
                    com fluxos de trabalho personalizáveis e inteligência artificial integrada.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                    {['Gestão de tarefas', 'Kanban', 'Gerador de E-mails com IA', 'Documentos', 'Agenda', 'Configurações por workspace'].map(tag => (
                        <Tag key={tag}>{tag}</Tag>
                    ))}
                </div>
            </div>

            {/* Keyboard shortcut highlight */}
            <div className="rounded-card bg-surface-card border border-border-subtle p-5 flex gap-4 items-start">
                <Keyboard size={20} className="text-brand shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-primary mb-1">Atalhos de teclado</p>
                    <p className="text-sm text-secondary mb-3">
                        Na página <strong>Minhas Tarefas</strong>, pressione <Kbd>?</Kbd> para ver o painel completo de atalhos de teclado disponíveis.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-secondary">
                        <span><Kbd>N</Kbd> Nova tarefa</span>
                        <span><Kbd>/</Kbd> Buscar</span>
                        <span><Kbd>↑↓</Kbd> Navegar</span>
                        <span><Kbd>Space</Kbd> Mudar status</span>
                        <span><Kbd>Enter</Kbd> Abrir</span>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div>
                <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">Módulos do sistema</h2>
                <div className="space-y-2">
                    {sections.map(section => (
                        <AccordionItem key={section.id} section={section} />
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-4 text-xs text-muted border-t border-border-subtle">
                VTask · Desenvolvido por Antigravity · {new Date().getFullYear()}
            </div>
        </div>
    );
}
