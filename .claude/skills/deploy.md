# deploy

Faz deploy do projeto para produção (https://vtask.vantecomunicacao.com.br).

## Contexto

- O deploy é feito via push para `main` no GitHub
- O Coolify detecta o push via webhook e executa `npm install` + `npm run build` automaticamente
- Não há feature branches — commits vão direto para `main`
- Variáveis de ambiente ficam no Coolify, não no repositório

## Passos

1. **Verificar estado do repositório**
   - Rodar `git status` para ver arquivos modificados, staged e untracked
   - Rodar `git log origin/main..HEAD --oneline` para ver commits locais ainda não enviados

2. **Se houver arquivos não commitados**, perguntar ao usuário:
   - Quer commitar tudo agora? Se sim, pedir a mensagem de commit
   - Ou prefere fazer o deploy apenas com o que já está commitado?

3. **Validar o build localmente**
   - Rodar `npm run build`
   - Se falhar, reportar o erro e interromper — não fazer push

4. **Fazer o push**
   - Rodar `git push origin main`
   - Reportar sucesso com o hash do último commit

5. **Confirmar para o usuário**
   - Informar que o Coolify irá detectar o push e iniciar o deploy automaticamente
   - Mostrar a URL de produção: https://vtask.vantecomunicacao.com.br
