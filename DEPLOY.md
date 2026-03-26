# Documentação de Deploy - VTask via Coolify e Github

Este documento detalha o processo de como realizar o deploy da aplicação **VTask** utilizando seu repositório do **Github** e o **Coolify**.

## 🚀 1. Atualizações e Deploy Contínuo (O Mais Comum)

Se a aplicação já está criada no Coolify e conectada ao Github, realizar novas atualizações (deploys) é muito simples.

### Via Github (Automático)
1. Certifique-se de que os seus arquivos locais estão rastreados no Git usando `git add .`
2. Crie um commit com suas alterações: `git commit -m "feat: sua descrição"`
3. Envie para o branch principal: `git push origin main`
4. **Pronto!** Se os webhooks do Github com o Coolify estiverem ativos (o padrão), o Coolify identificará o novo commit automaticamente e iniciará o deploy na sua URL de produção (`vtask.vantecomunicacao.com.br`).

### Via Painel do Coolify (Manual)
1. Acesse o painel do seu servidor Coolify.
2. Navegue até o seu projeto e acesse o ambiente correspondente (ex: Produção).
3. Clique em sua Aplicação (ex: `vtask-prod`).
4. Clique no botão roxo **"Deploy"** localizado no canto superior direito.
5. Acesse a aba **Logs** (ou "Show Debug Logs") para acompanhar o status e garantir que a instalação das dependências (`npm`) e do build ocorram com sucesso.

---

## ⚙️ 2. Como criar a aplicação do Zero no Coolify

Caso precise recriar o ambiente ou configurar uma filial/novo ambiente (Staging, etc), as etapas iniciais de criação são:

### Passo 1: Adicionar a Origem (Source)
1. No Coolify, vá em **Sources** (Origens) no menu lateral e certifique-se de que a sua source do Github (Github App) existe. Se não existir, crie uma e vincule a organização `vantecomunicacao`.

### Passo 2: Criar a Aplicação
1. Vá até o seu **Projeto** (Projects) e clique no **Environment** (ex: *Production*).
2. Clique em **+ New Resource**.
3. Escolha **Public Repository** ou **Github App** (dependendo de como sua conta foi vinculada).
4. Selecione o repositório `vantecomunicacao/vtask` e o branch `main`.
5. Clique em **Save**.

### Passo 3: Configuração da Aplicação
1. **Domains (FQDN):** Insira a URL desejada, com o `https://` (ex: `https://vtask.vantecomunicacao.com.br`).
2. **Build Pack:** Para projetos Vite/Node (como o do VTask), selecione a estratégia de build. O Coolify usa o **Nixpacks** por padrão que identificará sozinho suas configurações de Node (`npm i` e `npm run build`). Na última implantação notamos que a versão configurada automatica/manualmente no ambiente foi `NIXPACKS_NODE_VERSION=22`.
3. **Environment Variables (Variáveis de Ambiente):** Acesse a seção *Environment Variables* e preencha todas informações exigidas do seu `.env` (credenciais do Supabase, etc).
4. **Commands:** Geralmente, os campos *Install Command*, *Build Command* e *Start Command* podem ficar automáticos, mas caso precise forçar um comportamento, defina:
   - Build Command: `npm run build` ou `npm run build && ...` (dependendo do framework, o Nixpacks resolve isso sozinho).

### Passo 4: Deploy
- Clique em **Deploy**. O Coolify cuidará de provisionar os contêineres Docker, expor no seu domínio protegido por certificado SSL (Traefik/Caddy) e colocar a aplicação no ar.

---

## 📌 Dicas e Resoluções de Problemas
- **Problemas de Build (Typescript):** O Coolify roda o comando rigoroso de build (`tsc && vite build`). Se o deploy falhar, é muito comum ser um erro de tipagem no seu projeto Typescript. Abra a aba de logs no Coolify para descobrir em qual linha de código a construção travou.
- **Cancelamento:** Se precisar cancelar a subida dos arquivos para reverter, basta ir em *Deployments*, clicar na etapa atual e solicitar o cancelamento.
- **Logs da Aplicação (Runtime):** Se os contêineres iniciarem, mas algo der errado na visualização do Site (Erro 502 Bad Gateway), observe a seção final dos Logs normais dentro da dashboard do Coolify – o processo real no servidor poderá apontar as exceções.
