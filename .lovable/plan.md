
## Objetivo

Transformar a assistente (Marina e demais agentes) de "consulta somente-leitura" para **copiloto operacional completo**: além de listar, ela **cria, edita e exclui** registros nos módulos que o perfil do usuário já pode acessar hoje via UI. Exclusões exigem **dupla confirmação explícita** dentro do chat antes de executar.

Nada é hardcoded como "admin faz tudo": a assistente herda **exatamente as permissões RLS** que o usuário logado tem — nunca mais, nunca menos.

## Princípio de segurança

Hoje o edge function `ai-assistant` usa `service_role` (bypassa RLS). Isso é seguro para leitura porque filtramos `company_id`, mas **não pode continuar assim para escrita** — daria a qualquer perfil poder de escrever qualquer coisa.

Vamos mudar a estratégia:

- **Leitura**: continua com `service_role` + filtro `company_id` (rápido, já funciona).
- **Escrita (INSERT/UPDATE/DELETE)**: usar um **cliente Supabase autenticado com o JWT do usuário** (repassado pelo frontend no header `Authorization`). Assim o Postgres aplica as políticas RLS reais do perfil — se o usuário não pode deletar uma OS pela UI, a assistente também não conseguirá.

Isso garante que "acesso total de acordo com cada perfil" = literalmente as mesmas regras que o app já valida.

## Novas ferramentas de escrita por módulo

Adicionar ao catálogo em `supabase/functions/ai-assistant/tools.ts` um trio de tools para cada módulo consultável, seguindo o mesmo mapa `ROLE_MODULES`:

```
create_<modulo>(payload)
update_<modulo>(id, patch)
delete_<modulo>(id, confirm_token)   ← exige dupla confirmação
```

Módulos cobertos na primeira leva (os já mapeados + Lista Mestra que estamos adicionando):

- `service_orders`, `technicians`, `clients`, `vessels`
- `crm_opportunities`, `crm_sales`, `crm_products`, `crm_recurrences`, `crm_tasks`, `crm_buyers`
- `purchase_requests`
- `finance_payables`, `finance_receivables`
- `hr_employees` (via `profiles`), `hr_absences`, `hr_vacation_requests`, `hr_health_exams`
- `quality_ncrs`, `quality_audits`, `quality_documents` (Lista Mestra), `quality_company_documents`
- `corp_requests`
- `measurements` (initialize / update status)

Cada tool tem `inputSchema` mínimo (só os campos realmente editáveis, com `enum` para status e tipos) para o modelo não inventar coluna. Campos sensíveis (`company_id`, `created_by`, `id`) são preenchidos pelo servidor, nunca aceitos do modelo.

## Fluxo de exclusão com dupla confirmação

Padrão consistente para toda tool `delete_*`:

1. Primeira chamada do modelo: `delete_<modulo>({ id })` **sem** `confirm_token`.
2. Servidor **não deleta** — devolve:
   ```json
   {
     "requires_confirmation": true,
     "summary": "Excluir OS #1234 — Cliente X — Embarcação Y (criada em 12/03/2025)",
     "confirm_token": "del_<uuid>",
     "expires_in_seconds": 120
   }
   ```
   O token é assinado (HMAC com secret já disponível) e amarrado a `{userId, table, rowId, exp}` — sem estado em banco.
3. O modelo é instruído pelo system prompt a **parar a execução, mostrar o resumo ao usuário e pedir confirmação textual** ("Confirmar exclusão? Sim/Não").
4. Só quando o usuário responder afirmativamente o modelo chama novamente `delete_<modulo>({ id, confirm_token })`. O servidor valida o token, expira em 2 min, e executa via cliente autenticado (RLS aplica).
5. Qualquer confirm_token só serve para **um** delete específico — não é reutilizável para outro id/tabela.

Regra reforçada no prompt: **nunca pedir o token ao usuário nem exibi-lo**. É trocado só entre modelo e servidor.

## Ajustes no `index.ts`

1. **Ler `Authorization` do request** e criar um segundo client:
   ```
   userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
     global: { headers: { Authorization: req.headers.get("Authorization") } }
   })
   ```
   Passar `userClient` no `ToolCtx` para toda tool de escrita; manter `serviceClient` para leitura.

2. **Aumentar `stopWhen`** do loop de tool calling para permitir sequências ler→confirmar→gravar (hoje o loop é curto). Alvo: `stepCountIs(12)`.

3. **System prompt** — adicionar bloco "AÇÕES DE ESCRITA":
   - Antes de criar/editar, **repetir o resumo do que vai fazer** e só executar se o usuário confirmar em linguagem natural.
   - Para deletar: nunca chamar `delete_*` com `confirm_token` na primeira vez; sempre em duas etapas.
   - Se a tool retornar erro de RLS/permissão, dizer claramente "seu perfil não pode fazer isso" — não tentar contornar.
   - Registrar mentalmente que ações destrutivas exigem confirmação **textual** do usuário mesmo após a primeira resposta do servidor.

## Auditoria

Toda escrita passa por um log em nova tabela `ai_assistant_actions`:
- `user_id`, `role`, `agent_id`, `tool_name`, `table_name`, `row_id`, `action` (`create|update|delete`), `payload_before` (para update/delete), `payload_after`, `success`, `error_message`, `created_at`.
- RLS: usuário vê só suas ações; `hr/admin/director/super_admin` veem tudo da empresa.
- Grava mesmo em caso de falha de RLS, para rastrear tentativas.

## Frontend (`AIChat.tsx` / `useAIChat.ts`)

Mudanças mínimas:

- Enviar o `Authorization: Bearer <access_token>` no invoke (o cliente Supabase já faz isso via `supabase.functions.invoke` quando há sessão — só validar).
- Renderizar mensagens de confirmação com dois botões utilitários **"Confirmar" / "Cancelar"** quando a última resposta do assistente contiver um marcador padronizado (`[[CONFIRM_ACTION]]`) — só melhora UX, o fluxo funciona igual só com texto.
- Nenhum novo secret; nenhuma nova rota.

## Arquivos afetados

- `supabase/functions/ai-assistant/tools.ts` — trio create/update/delete por módulo, schemas por tool, helper de token de confirmação.
- `supabase/functions/ai-assistant/index.ts` — user-authenticated client, regras novas do system prompt, `stepCountIs` maior, chamada ao logger.
- `supabase/functions/_shared/ai-confirm-token.ts` (novo) — assinatura/verificação HMAC do `confirm_token`.
- **Migração**: nova tabela `ai_assistant_actions` + RLS + índices.
- `src/components/ai/AIChat.tsx` — botões opcionais de "Confirmar/Cancelar" ao detectar marcador.

## Validação

1. Perfil `qualidade` pede *"crie uma NCR sobre atraso na entrega do fornecedor X, severidade alta"* → assistente resume, pede confirmação, chama `create_quality_ncrs`, retorna o número gerado.
2. Perfil `technician` pede *"delete a OS 1234"* → tool responde erro de RLS, assistente informa que o perfil não permite.
3. Perfil `coordinator` pede *"exclua o cliente ACME"* → assistente pede confirmação textual, usuário confirma, exclusão executa e aparece em `ai_assistant_actions`.
4. Tentar reusar um `confirm_token` para outro id → servidor rejeita.
5. Deixar passar 3 min entre pedido e confirmação → token expira, assistente reinicia o fluxo.
