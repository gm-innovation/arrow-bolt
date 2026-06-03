## Objetivo
Garantir que as "Instruções por role" da Marina nunca fiquem vazias — seedar valores padrão no banco e adicionar fallback na edge function.

## 1. Seed no banco (migração de dados via UPDATE)
Atualizar `ai_agents` onde `slug = 'marina'` (ou o agente padrão da empresa), mesclando `behavior.role_instructions` com textos padrão por role. Só preenche chaves que estejam vazias/ausentes (preserva o que o admin já editou).

Textos padrão por role:
- **technician** — Foco em OS atribuídas, geração de relatórios técnicos, escala/ausências, materiais e EPIs. Linguagem direta e operacional.
- **coordinator** — Acesso a OS, técnicos, clientes, embarcações, medições, compras, CRM (leads/oportunidades), qualidade. Pode consultar disponibilidade, status de OS, ranking e dados comerciais do seu escopo.
- **manager** — Visão tática completa: OS, produtividade, financeiro operacional, RH, qualidade. Responde com dados consolidados.
- **director** — Visão estratégica: KPIs gerais, financeiro completo, CRM pipeline, aprovações, RH e compras. Tom executivo e sintético.
- **hr** — Colaboradores, admissões/onboarding, ausências, escalas, EPI, treinamentos (universidade), folha e documentos. Cuidado com PII.
- **commercial** — CRM completo (leads, oportunidades, recorrências, clientes, contatos, embarcações, base de conhecimento, tarefas comerciais). Foco em conversão e funil.
- **financeiro** — Contas a pagar/receber, reembolsos, categorias, fluxo de caixa, conciliações.
- **qualidade** — NCRs, auditorias, planos de ação, indicadores de qualidade.
- **compras** — Solicitações de compra, itens, status de aprovação, fornecedores.

SQL conceitual:
```sql
UPDATE ai_agents
SET behavior = jsonb_set(
  coalesce(behavior, '{}'::jsonb),
  '{role_instructions}',
  coalesce(behavior->'role_instructions', '{}'::jsonb) || '<DEFAULTS_JSONB>'::jsonb
)
WHERE slug = 'marina' OR is_default = true;
```
O operador `||` à direita do que já existe garante que valores salvos pelo admin não sejam sobrescritos — então invertemos: `DEFAULTS || existing`, mantendo `existing` como prioridade.

## 2. Fallback na edge function
Em `supabase/functions/ai-assistant/index.ts`, criar constante `DEFAULT_ROLE_INSTRUCTIONS` com os mesmos textos. Ao montar o prompt:
```ts
const roleInstruction =
  behavior?.role_instructions?.[userRole]?.trim() ||
  DEFAULT_ROLE_INSTRUCTIONS[userRole] ||
  undefined;
```
Assim, se alguém apagar a instrução na UI, a Marina ainda recebe um comportamento sensato por role.

## 3. Sem mudanças na UI
A BehaviorTab já lê `behavior.role_instructions[role]` — após o seed, os textareas aparecerão preenchidos automaticamente ao recarregar a página.

## Arquivos afetados
- Nova migração de dados (UPDATE em `ai_agents`)
- `supabase/functions/ai-assistant/index.ts` (constante + fallback)

## Validação
1. Recarregar `/super-admin/ai-management` → aba Comportamento → textareas preenchidos.
2. Testar Marina como coordinator perguntando sobre leads → deve responder com dados reais.
3. Limpar manualmente uma instrução, salvar, perguntar de novo → fallback entra em ação.