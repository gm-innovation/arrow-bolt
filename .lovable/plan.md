
Objetivo: remover a tela em branco estabilizando o carregamento inicial do app.

Diagnóstico (com base nos sinais atuais):
- A tela fica cinza/branca e o app não monta.
- No console, aparecem falhas de carregamento de módulos com `503`/`ERR_ABORTED` (ex.: `react-router-dom.js`, `src/pages/Login.tsx`, `src/pages/corp/admin/RequestTypes.tsx`).
- O `App.tsx` importa muitas páginas de forma síncrona; qualquer falha em um módulo durante o boot pode derrubar toda a aplicação.
- O projeto registra Service Worker no bootstrap; isso pode piorar inconsistências de cache durante desenvolvimento/preview.

Plano de implementação:
1) Endurecer bootstrap (evitar cache instável no preview)
- Arquivo: `src/main.tsx`
- Registrar Service Worker apenas em produção.
- Em desenvolvimento/preview, desregistrar SW existente para evitar servir bundle/module desatualizado.

2) Reduzir risco de “falha global” no carregamento inicial
- Arquivo: `src/App.tsx`
- Migrar páginas pesadas para carregamento lazy (`React.lazy` + `Suspense`) em grupos (começando por blocos corp/commercial/admin).
- Manter apenas rotas essenciais síncronas (auth e shell mínimo).
- Resultado: se um módulo falhar, não quebra todo o bootstrap inicial.

3) Fallback explícito de carregamento e erro
- Arquivo: `src/App.tsx`
- Envolver árvore de rotas em `Suspense` com fallback visual.
- Adicionar boundary de erro no nível de rotas para evitar página totalmente vazia e mostrar estado de recuperação.

4) Verificação pós-correção
- Validar `/`, `/login` e rota autenticada (ex.: `/tech/dashboard`).
- Confirmar que não há mais `503` para módulos críticos no console/rede.
- Confirmar renderização normal após hard refresh (sem tela em branco).

Detalhes técnicos (resumo):
- Não há mudança de banco/autenticação/regras de acesso.
- Foco total em estabilidade de frontend (boot, loading strategy e cache behavior).
- Arquivos principais previstos: `src/main.tsx`, `src/App.tsx` (e opcionalmente split de imports por domínio para organização).
