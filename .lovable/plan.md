## Objetivo

Adicionar uma aba visível **"Ações de Escrita"** em `/super-admin/ai-management`, ao lado de Guardrails/Tools & Modelo, para que o super admin veja e controle o que a Marina (e outros agentes) podem **criar / editar / excluir** por módulo. Hoje essas capacidades existem só no backend (`tools.ts` + system prompt) — sem reflexo na UI.

## Onde encaixa

`src/pages/super-admin/AIManagement.tsx` já tem um `Tabs` com 7 abas. Vamos:
- Adicionar uma 8ª aba **"Ações de Escrita"** entre "Guardrails" e "Tools & Modelo".
- Criar `src/components/super-admin/ai/WriteActionsTab.tsx`.
- Persistir a configuração em `agent.scope.write_actions` (campo JSON já existente em `ai_agents`, sem migração).

## O que a aba mostra

Cabeçalho explicativo curto: "Controle quais módulos a assistente pode alterar. Independente do que estiver marcado aqui, a assistente sempre respeita as permissões RLS do usuário logado — nunca escala privilégios."

Abaixo, uma **tabela de módulos** (uma linha por tabela habilitada em `tools.ts`), agrupada por área:

- **Operações**: `service_orders`, `technicians`, `measurements`
- **CRM / Comercial**: `clients`, `vessels`, `crm_opportunities`, `crm_sales`, `crm_products`, `crm_recurrences`, `crm_tasks`, `crm_buyers`
- **Suprimentos**: `purchase_requests`
- **Financeiro**: `finance_payables`, `finance_receivables`
- **RH**: `hr_employees`, `hr_absences`, `hr_vacation_requests`, `hr_health_exams`
- **Qualidade**: `quality_ncrs`, `quality_audits`, `quality_documents`, `quality_company_documents`
- **Corporativo**: `corp_requests`

Cada linha tem 3 switches: **Criar**, **Editar**, **Excluir** (excluir vem com badge "requer dupla confirmação").

Rodapé da aba: 2 botões utilitários — **"Habilitar tudo (leitura + escrita)"** e **"Somente leitura"** (desliga todos os switches de uma vez).

Ao lado da tabela, um painel lateral com **últimas 20 ações auditadas** deste agente (SELECT em `ai_assistant_actions` filtrado por `agent_id`), mostrando: usuário, tool, tabela, status (sucesso/erro), data. Link "Ver tudo" abre uma futura tela de auditoria (fora deste escopo — só o link fica preparado).

## Como o backend passa a respeitar isso

Em `supabase/functions/ai-assistant/tools.ts`, dentro das factories `makeCreateTool` / `makeUpdateTool` / `makeDeleteTool`:

- Antes de executar, ler `agent.scope.write_actions?.[table]?.[action]` (default: `true`, para não quebrar agentes existentes).
- Se estiver `false`, retornar erro amigável: `"Esta assistente não está autorizada a <ação> em <módulo>. Peça ao super admin para habilitar em Configurações do agente → Ações de Escrita."` — sem tentar chamar o banco.
- O `ROLE_MODULES` continua controlando o que cada **perfil de usuário** pode acessar; o novo switch controla o que o **agente** pode fazer no geral (interseção com RLS ainda vale).

## Formato salvo em `agent.scope.write_actions`

```json
{
  "service_orders": { "create": true, "update": true, "delete": false },
  "quality_ncrs":   { "create": true, "update": true, "delete": true  }
}
```

Módulos ausentes = default `true` (retrocompatível com a Marina atual).

## Arquivos afetados

- `src/pages/super-admin/AIManagement.tsx` — adicionar `<TabsTrigger value="write-actions">` e `<TabsContent>` correspondente; expandir grid para `grid-cols-8`.
- `src/components/super-admin/ai/WriteActionsTab.tsx` (novo) — tabela de switches + painel de últimas ações.
- `src/hooks/useAIAssistantActions.ts` (novo) — hook simples para ler `ai_assistant_actions` por `agent_id`.
- `supabase/functions/ai-assistant/tools.ts` — checagem de `agent.scope.write_actions` nas três factories.
- `supabase/functions/ai-assistant/index.ts` — garantir que `scope` do agente é passado no `ToolCtx` (hoje já é carregado, só confirmar propagação).

## Validação

1. Abrir `/super-admin/ai-management` → Marina → aba **Ações de Escrita** aparece.
2. Desligar "Excluir" em `quality_ncrs`, salvar. Pedir à Marina "delete a NCR X" → ela responde que a ação está desabilitada, sem chamar o banco.
3. Reativar, pedir de novo → fluxo normal de dupla confirmação executa.
4. Painel lateral mostra a última tentativa (bloqueada) e a exclusão bem-sucedida com timestamps.
5. Agente sem `scope.write_actions` (Marina hoje) continua funcionando como antes — nada bloqueado por default.
