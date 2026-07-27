## Objetivo

Tornar o comportamento "fora de escopo" da Marina **totalmente configurável** pelo Gerenciamento da IA (`/super-admin/ai-management`), sem nada hard-coded no prompt ou nas Edge Functions. O Super Admin pode editar textos, mapeamentos assunto→setor, e ligar/desligar canais.

## Onde entra a configuração

Estende `ai_agents.behavior` (JSONB já existente) com um novo bloco `out_of_scope`, editado por uma nova aba **"Escopo e Encaminhamento"** no gerenciador do agente. Nada de nova tabela.

```ts
// src/hooks/useAIAgents.ts — AIAgentBehavior
out_of_scope?: {
  enabled: boolean;                    // liga/desliga o comportamento
  policy: "explain_and_offer"          // explica + oferece chamado (padrão)
        | "explain_only"               // só explica, não encaminha
        | "refuse"                     // recusa educadamente
        | "off";                       // não trata (comportamento antigo)
  explain_template: string;            // texto base p/ explicação alto nível
  offer_template: string;              // frase que pergunta "posso abrir?"
  confirmation_template: string;       // resposta pós-criação com nº do chamado
  refusal_template: string;            // usado quando policy = "refuse"
  channel: "corp_request"              // padrão
         | "support_ticket"            // Super Admin
         | "both";                     // deixa Marina escolher
  area_routing: Array<{
    area_key: string;                  // "rh" | "financeiro" | ...
    label: string;                     // "RH", "Financeiro"
    department_slug?: string;          // mapeia p/ departments.slug
    keywords: string[];                // palavras-chave p/ classificar
    default_request_type_slug?: string;// mapeia p/ corp_request_types.slug
    default_priority?: "low"|"medium"|"high"|"critical";
    enabled: boolean;
  }>;
};
```

Seed inicial (default_agent) traz o mapa atual (RH, Financeiro, Suprimentos, Qualidade, Comercial, Marketing, Coordenação, Diretoria) já preenchido, mas 100% editável.

## Nova aba na UI: `ScopeRoutingTab.tsx`

Localização: `src/components/super-admin/ai/ScopeRoutingTab.tsx`, plugada em `AIManagement.tsx` como aba entre "Comportamento" e "Ações de Escrita".

Conteúdo:

1. **Toggle geral** "Tratar perguntas de outra área" + `Select` de política (`explain_and_offer` / `explain_only` / `refuse` / `off`).
2. **Canal de encaminhamento** (`corp_request` / `support_ticket` / `both`).
3. **Templates de resposta** (4 Textareas com placeholders documentados: `{{area}}`, `{{title}}`, `{{ticket_number}}`).
4. **Tabela editável de áreas** (Add/Remove linha):
   - `label` (input) · `area_key` (input) · `department_slug` (Combobox de `departments`) · `default_request_type_slug` (Combobox de `corp_request_types`) · `keywords` (TagInput) · `priority` (Select) · `enabled` (Switch).
5. **Preview de classificação**: input "Simular pergunta" → mostra qual área a Marina classificaria pelas keywords atuais. Puramente client-side (útil pra testar antes de salvar).

Persistência: usa a mutation `useUpdateAIAgent` já existente, salvando em `behavior.out_of_scope`.

## Consumo no backend

Em `supabase/functions/ai-assistant/index.ts`:

1. `buildSystemPrompt` recebe `behavior.out_of_scope` e, se `enabled`, injeta um bloco dinâmico no prompt (não mais fixo):

```ts
if (oos?.enabled && oos.policy !== "off") {
  systemPrompt += renderOutOfScopeBlock(oos);
}
```

`renderOutOfScopeBlock` gera o texto a partir dos templates + tabela de áreas configurada. Nenhum texto de setor fica no código; tudo vem do JSON.

2. Novas ferramentas registradas dinamicamente **só se a política permitir**:
   - `create_corp_request({ area_key, title, description, priority? })` — resolve `department_id` e `request_type_id` via `area_routing[area_key]` do agente, insere em `corp_requests`.
   - `list_my_corp_requests({ status?, limit? })`.
   - `create_support_ticket` continua como está (é do bloco Super Admin).

Se `channel = "support_ticket"`, a Marina usa apenas `create_support_ticket`. Se `both`, o prompt orienta a escolher segundo a natureza (pedido operacional × bug/sugestão).

3. Toda ação registra em `ai_assistant_actions` (já existe).

## Fluxo de dados resumido

```text
Super Admin edita aba "Escopo e Encaminhamento"
        │  (grava em ai_agents.behavior.out_of_scope)
        ▼
Edge Function ai-assistant lê behavior.out_of_scope no início da requisição
        │
        ▼
Monta prompt dinâmico + registra ferramentas de encaminhamento adequadas
        │
        ▼
Marina classifica → explica → oferece → cria corp_request/support_ticket
```

## Detalhes técnicos

- **Migração**: nenhuma. Apenas um seed opcional para popular `behavior.out_of_scope` do agente default nas empresas existentes (via UPDATE JSONB idempotente).
- **Validação**: `ScopeRoutingTab` valida `area_key` único, keywords não vazias e existência de `department_slug`/`request_type_slug` antes de habilitar cada linha.
- **Fallback**: se `out_of_scope` estiver ausente/`enabled=false`, o comportamento atual permanece (só `create_support_ticket` para bug/sugestão).
- **Auditoria**: mudanças no agente já gravam `updated_at`; nada extra necessário.
- **Sem hard-code**: o prompt continua com as "regras técnicas mínimas" (não editáveis, como já é hoje), mas todo o texto e mapeamento de áreas passa a vir da configuração.

## Fora deste plano

- Não altera `create_support_ticket` (canal Super Admin) — segue igual.
- Não altera `modulesForRole` / filtragem de módulos por role.
- Não cria tabela nova; usa `ai_agents.behavior` + `departments` + `corp_request_types` já existentes.
