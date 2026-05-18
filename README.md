# FlowDesk — Gestão de Tarefas para Agências

Aplicação web de gerenciamento de tarefas e projetos, construída para agências com fluxo Kanban, documentos colaborativos e controle por workspace.

## Stack

- **Frontend:** React 19, TypeScript 5, Vite 7
- **Estilização:** Tailwind CSS v4 (tokens via `@theme` em `src/index.css`, sem `tailwind.config.js`)
- **Estado:** Zustand 5
- **Backend/DB:** Supabase (auth, PostgreSQL, Storage)
- **Roteamento:** React Router 7 (lazy-loaded)
- **Formulários:** React Hook Form + Zod
- **Editor rich text:** Tiptap
- **Drag-and-drop:** @hello-pangea/dnd
- **Toasts:** Sonner

## Pré-requisitos

- Node.js 20+
- Conta e projeto no [Supabase](https://supabase.com)

## Configuração

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Crie o arquivo `.env.local` na raiz com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sua-anon-key>
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Type-check + build de produção |
| `npm run lint` | ESLint em todos os arquivos |
| `npm run test` | Vitest em modo watch |
| `npm run test:run` | Vitest execução única (CI) |
| `npm run test:coverage` | Relatório de cobertura (v8, saída HTML) |

Para rodar um arquivo de teste isolado:
```bash
npx vitest run src/components/ui/Button.test.tsx
```

## Estrutura de pastas

```
src/
├── components/
│   ├── kanban/        # KanbanBoard e colunas
│   ├── tasks/         # TaskRow, TaskDetailModal, TaskFormModal, filtros
│   ├── projects/      # Cards e formulários de projetos
│   ├── documents/     # Editor Tiptap e árvore de documentos
│   ├── layout/        # AppLayout, sidebar, header
│   ├── ui/            # Design system (Button, Dialog, Input, Select, DatePicker…)
│   └── providers/     # ThemeProvider, ErrorBoundary
├── contexts/          # TaskDetailContext
├── hooks/             # Hooks reutilizáveis (useTaskFilters, useSidebarState…)
├── lib/
│   ├── dateUtils.ts   # parseDueDate, todayLocalISO
│   ├── utils.ts       # cn() (clsx + tailwind-merge)
│   ├── validation.ts  # schemas Zod
│   ├── storage.ts     # helpers de upload (Supabase Storage)
│   └── database.types.ts  # tipos auto-gerados pelo Supabase CLI
├── pages/             # Uma página por rota
├── store/             # Stores Zustand (task, project, workspace, auth, notification)
└── test/              # Setup e testes unitários
```

## Rotas

| Rota | Página |
|---|---|
| `/login` | Autenticação |
| `/dashboard` | Visão geral com stats |
| `/tarefas` | Minhas tarefas (lista) |
| `/projetos` | Todos os projetos |
| `/projetos/:id` | Detalhe do projeto (Kanban + Lista) |
| `/documentos` | Documentos colaborativos |
| `/documentos/:id` | Editor de documento |
| `/configuracoes` | Workspace, membros e funil de status |
| `/agenda` | Calendário (em breve) |
| `/gerador-email` | Gerador de e-mails por IA (em breve) |
| `/arquivados` | Tarefas arquivadas |
| `/lixeira` | Tarefas excluídas |
| `/admin` | Painel de administração (platform admin) |

## Stores (Zustand)

Cada store é responsável pelas suas próprias queries ao Supabase:

| Store | Exports principais | Observações |
|---|---|---|
| `taskStore` | `useTaskStore`, `TaskWithAssignee` | Cache de 30s; `fetchWorkspaceTasks` é o entry point principal |
| `projectStore` | `useProjectStore`, `ProjectWithClient` | |
| `workspaceStore` | `useWorkspaceStore` | `activeWorkspace` é a FK raiz de tudo |
| `authStore` | `useAuthStore` | `session` controla o `ProtectedRoute` |
| `notificationStore` | `createNotification` | Chamado pelo taskStore ao mover tarefas |

## Comportamentos automáticos de tarefas

- **1º status** — ponto de entrada de novas tarefas. Tarefas com prazo vencido (hoje ou anterior) são movidas automaticamente para cá ao carregar o app.
- **Último status** — sempre considerado "Concluído". Marcar uma tarefa como feita a move para cá.

## Padrões importantes

**Joins do Supabase retornam arrays — sempre indexar `[0]`:**
```ts
member.profiles[0]?.full_name
```

**Filtrar tarefas por workspace (sem FK direta):**
```ts
const { data: projectRows } = await supabase.from('projects').select('id').eq('workspace_id', wid);
const ids = projectRows?.map(p => p.id) ?? [];
supabase.from('tasks').select('*').in('project_id', ids);
```

**`setState` dentro de `useEffect` — usar IIFE async:**
```ts
useEffect(() => {
  (async () => {
    const data = await fetchSomething();
    setState(data);
  })();
}, [dep]);
```

**Datas de vencimento — nunca usar `new Date()` diretamente:**
```ts
parseDueDate(str)   // evita off-by-one em UTC-3
todayLocalISO()     // retorna yyyy-MM-dd no fuso local
```

## Testes

- Ambiente: jsdom, globals habilitados
- Setup: `src/test/setup.ts`
- Cobertura: `src/hooks/**`, `src/components/**`, `src/store/**`
- `src/lib/database.types.ts` é ignorado pelo ESLint (auto-gerado, pode ter BOM)

## Funcionalidades

| Funcionalidade | Status |
|---|---|
| Auth (login/logout) | Disponível |
| Kanban com drag-and-drop | Disponível |
| Criação de tarefas e projetos | Disponível |
| Modal de detalhe (status, comentários, anexos) | Disponível |
| Dashboard com stats reais | Disponível |
| Minhas Tarefas (`/tarefas`) | Disponível |
| Vista Lista no projeto | Disponível |
| Configurações com membros reais | Disponível |
| Documentos colaborativos (Tiptap) | Disponível |
| Dark mode | Disponível |
| Log de atividades | Pendente |
| Invite de membros | Pendente (requer Edge Function) |
| Real-time subscriptions | Pendente |
| Agenda/Calendar | Pendente |
