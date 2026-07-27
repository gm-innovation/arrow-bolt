## Diagnóstico

Confirmei no banco e nos logs:

- Ticket **#1003** (o da tela): `conversation_excerpt = []` (array vazio) e `dev_prompt_status = 'pending'` há 13 dias.
- Ticket **#1002**: `conversation_excerpt` com 8 mensagens, mas também travado em `'pending'`.
- A edge function `generate-ticket-dev-prompt` **não tem nenhum log** desde que foi criada — ou seja, nunca foi invocada com sucesso (nem pelo gatilho automático em `tools.ts`, nem pelo botão "Regerar" do Inbox).

### Causa 1 — contexto da conversa vazio (#1003)
O ajuste que injeta a mensagem atual em `conversationExcerpt` está em `supabase/functions/ai-assistant/index.ts` (linhas 172-174), mas o ticket foi criado sem esse trecho — a função não estava com o fix ativo. Além disso, o painel do Inbox esconde totalmente o bloco quando o array vem vazio (`length > 0` no `SupportInbox.tsx:367`), então o usuário nem vê que houve uma tentativa.

### Causa 2 — prompt "Gerando" infinito
Fluxo atual do botão Regerar (`SupportInbox.tsx:122-140`):
1. Marca `dev_prompt_status = 'pending'` no banco (otimista).
2. Chama `supabase.functions.invoke("generate-ticket-dev-prompt")`.
3. Se o invoke falha (erro CORS, função não deployada, throw interno antes do `update`), o `onError` mostra toast mas **o status permanece 'pending' no banco para sempre** → UI fica travada em "Gerando".

O mesmo vale para o disparo fire-and-forget em `tools.ts:1067`: se o `fetch` falhar (rede, chave ausente) o `.catch` só imprime no console e o ticket fica pending eterno.

Nenhum log da função sugere que ela está sendo chamada, o que aponta para falha no invoke (auth/CORS/deploy) e não para timeout dentro da IA.

## Plano de correção

### 1. Robustez do botão "Regerar" (`src/pages/super-admin/SupportInbox.tsx`)
- Remover o UPDATE otimista para `pending` antes do invoke.
- Deixar a própria edge function marcar `pending` (já faz na linha 76-79).
- No `onError` da mutation, marcar `dev_prompt_status = 'failed'` com `dev_prompt_error` = mensagem, para desprender o botão.
- Ler `error.context.text()` (padrão `FunctionsHttpError`) para trazer a mensagem real da função em vez do genérico "non-2xx".

### 2. Auto-recuperação de tickets travados
- Ao carregar o Inbox, para cada ticket com `dev_prompt_status = 'pending'` cujo `updated_at` seja mais antigo que 2 minutos, exibir badge "Interrompido" + habilitar "Regerar" (hoje o botão fica desabilitado enquanto `status === 'pending'`, o que trava a UI).
- Alternativa mais forte: uma função SQL/CRON que expira `pending > 5min` para `failed`. Preferência: só ajustar a UI para não ficar em impasse.

### 3. Sempre mostrar o bloco "Conversa com Marina" (`SupportInbox.tsx:367`)
- Renderizar o bloco mesmo com array vazio ou nulo.
- Quando vazio, exibir mensagem explicativa: *"Contexto não capturado (ticket antigo ou criado antes do fix). Novos chamados registrarão automaticamente as últimas mensagens."*
- Isso responde à queixa "não aparece o bloco".

### 4. Garantir que novos tickets tenham contexto (`supabase/functions/ai-assistant/index.ts`)
- Já existe a lógica correta (`priorExcerpt + currentUserExcerpt`). Redepoloy da função para garantir que a versão atual esteja ativa (o Lovable faz auto-deploy quando o arquivo muda; vamos tocar o arquivo com um comentário/versão bump para forçar redeploy).
- Log adicional em `tools.ts:1053` imprimindo o tamanho do `conversation_excerpt` gravado, para diagnóstico futuro.

### 5. Gatilho automático mais confiável (`supabase/functions/ai-assistant/tools.ts:1062-1076`)
- Antes do fire-and-forget, marcar o ticket recém-criado com `dev_prompt_status = 'pending'`, `dev_prompt_error = null`.
- Se `SUPABASE_SERVICE_ROLE_KEY` estiver ausente, imediatamente marcar `'failed'` com erro claro (em vez de continuar silencioso).
- Envolver o `fetch` em `try/catch` que ao falhar grava `dev_prompt_status = 'failed'` + `dev_prompt_error` no ticket. Assim o Inbox nunca fica em "Gerando" perpétuo.
- Bump de versão no cabeçalho do arquivo para forçar redeploy.

### 6. Bump/redeploy da `generate-ticket-dev-prompt`
- Adicionar log no início (`console.log("generate-ticket-dev-prompt invoked", ticket_id)`) para conseguirmos ver via `edge_function_logs` se o próximo Regerar chega até a função.
- Bump de versão para garantir novo deploy.

## Detalhes técnicos

Arquivos alterados:
- `src/pages/super-admin/SupportInbox.tsx` — mutation Regerar, badge de interrompido, bloco de contexto sempre visível.
- `supabase/functions/ai-assistant/tools.ts` — pré-marca pending, error handling do fire-and-forget, bump.
- `supabase/functions/ai-assistant/index.ts` — bump (força redeploy) + log de tamanho de excerpt.
- `supabase/functions/generate-ticket-dev-prompt/index.ts` — logs de entrada/saída + bump.

Sem migrations novas (as colunas `dev_prompt*` já existem).

## Verificação
1. Abrir #1003, clicar Regerar → conferir em `edge_function_logs generate-ticket-dev-prompt` que aparece "invoked" e depois "ready"/"failed".
2. Se falhar, o toast mostrará a razão real (via `FunctionsHttpError.context.text()`) e o botão volta a ficar clicável.
3. Criar novo ticket via Marina em qualquer perfil → conferir que `conversation_excerpt` no banco tem `length ≥ 1` e que o bloco aparece no Inbox.
