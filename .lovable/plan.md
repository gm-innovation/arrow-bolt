## Esclarecimento aceito

Ter duas contas com o mesmo nome não é problema:

- Cada usuário é identificado pelo **e-mail**, não pelo nome.
- Se um colaborador acumular funções, o correto é ter **múltiplos papéis vinculados ao mesmo usuário** em `user_roles`, mantendo um único login.
- Duas contas distintas (dois e-mails) são apenas duas linhas no banco; ambas devem autenticar normalmente e acessar suas áreas correspondentes.

Portanto, o plano **não** vai mexer nas duas contas da Rayane nem consolidar cadastros. O foco é garantir que qualquer usuário autenticado — independentemente do papel — consiga abrir chamados via Marina.

## Diagnóstico

- A conversa que falhou pertence à conta `qualidade@googlemarine.com.br` (papel `qualidade`), com company_id definido.
- A política RLS de `support_tickets` só exige `auth.uid() = user_id` no INSERT. Não há bloqueio por papel.
- O agente Marina **não** tem `support_tickets` na lista de `write_actions`, então a lógica atual permite a ação por padrão.
- A tool `create_support_ticket` faz o INSERT via `ctx.userSupabase` (client autenticado com o JWT do usuário).
- No client, `useAIChat` monta o header assim:  
  `Authorization: Bearer ${session.access_token ?? VITE_SUPABASE_PUBLISHABLE_KEY}`
- Se, no momento do envio, `getSession()` retornar sem `access_token`, o request vai para a edge function usando a **publishable key**. Dentro da função, o `userSupabase` roda como `anon`, `auth.uid()` fica `NULL`, e o INSERT bate na política `users_insert_own_tickets` → “problema de autenticação”.

Isso independe de a sessão do app estar válida na tela; é uma condição de corrida entre a hidratação da sessão e o envio da mensagem para a Marina.

## Plano

### 1. Nunca chamar a Marina como anônimo
Arquivo: `src/hooks/useAIChat.ts`
- Remover o fallback `?? VITE_SUPABASE_PUBLISHABLE_KEY` no header `Authorization`.
- Antes de enviar, garantir um `access_token` real:
  - `supabase.auth.getSession()`; se não houver token, tentar `supabase.auth.refreshSession()` uma vez.
  - Se ainda faltar token, abortar o envio e mostrar toast: “Sua sessão precisa ser reautenticada para conversar com a Marina. Faça login novamente.”
- Isso corta o caminho em que um usuário autenticado dispara a Marina sem identidade real.

### 2. Validar identidade dentro da edge function
Arquivo: `supabase/functions/ai-assistant/index.ts`
- Após criar o `userSupabase` a partir do header `Authorization`, chamar `userSupabase.auth.getUser()`.
- Se falhar, retornar `401 { error: "Sessão inválida. Faça login novamente para continuar." }`.
- Sobrescrever `toolCtx.userId` com o `user.id` verificado do token — nunca confiar apenas no `context.userId` vindo do body.
- Buscar `company_id` do `profiles` pelo `user.id` verificado; usar como `toolCtx.companyId` (fallback para o do body só se não existir).
- Manter `verify_jwt = false` no `config.toml` (padrão) — a validação passa a ser feita em código.

### 3. Endurecer a tool e melhorar a mensagem ao usuário
Arquivo: `supabase/functions/ai-assistant/tools.ts`, handler `create_support_ticket`
- Após o INSERT, se `error` contiver `row-level security` ou `permission`, devolver:  
  `{ error: "Não consegui registrar seu chamado agora — sua sessão precisa ser reautenticada. Faça login novamente e tente de novo." }`  
  Manter o erro técnico em `console.error`.
- Manter o INSERT via `userSupabase` (mesmo caminho de RLS já em uso).

### 4. Validação
- Fazer login com a conta `qualidade@googlemarine.com.br` (papel `qualidade`) na pré-visualização.
- Pedir à Marina para abrir um chamado e confirmar sua criação.
- Consultar `support_tickets` e conferir que a linha nova tem `user_id = f37fd779-5cb0-49f2-9dbe-f24be2b5b368` e `company_id` correto.
- Repetir para um segundo usuário comum (qualquer papel operacional) para confirmar que não é específico do super_admin.
- Confirmar que o super_admin continua conseguindo abrir chamados normalmente.

## Fora de escopo
- Consolidar/mesclar as duas contas da Rayane. Cada e-mail permanece como uma conta independente.
- Alterar políticas RLS, GRANTs ou schema de `support_tickets`.
- Mudanças em `/super-admin/support-inbox`, PM Dashboard, walkthrough ou PWA.
- Regras de acúmulo de papéis: a base já suporta múltiplas linhas em `user_roles` por usuário; isso continua igual.

## Detalhes técnicos
- Arquivos alterados: `src/hooks/useAIChat.ts`, `supabase/functions/ai-assistant/index.ts`, `supabase/functions/ai-assistant/tools.ts`.
- Nenhuma migração de banco.
- Edge function `ai-assistant` continua com `verify_jwt = false`; a autorização vira responsabilidade explícita do código via `auth.getUser()`.
