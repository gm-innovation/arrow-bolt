## Problema

Quando o usuário pergunta "tem algum lead novo?", Marina interpreta "novo" como recência (últimos 7 dias) e filtra por `since_days`, em vez de filtrar pelo `status = "novo"`. Resultado: ela diz "não há leads" mesmo havendo leads com status "novo" (como visto no print dos últimos 30 dias).

## Solução

Ajustar a interpretação da palavra "novo/novos" no contexto de leads para usar o filtro de **status**, não de data.

### 1. `supabase/functions/ai-assistant/tools.ts` — tool `query_crm_leads`

- Atualizar `description` para deixar explícito que leads possuem o status `"novo"` (além de `contatado`, `qualificado`, `convertido`, `descartado` etc.) e que perguntas sobre "leads novos" devem usar `status: "novo"` — não `since_days`.
- Atualizar a `description` do parâmetro `status` mencionando os valores válidos do funil de leads.
- Atualizar a `description` do parâmetro `since_days` deixando claro que serve apenas para recorte temporal explícito (ex.: "últimos 30 dias"), nunca para a palavra "novo".

### 2. `supabase/functions/ai-assistant/index.ts` — system prompt

Adicionar regra curta ao bloco de regras críticas:

> Para leads/oportunidades, "novo/novos" refere-se ao **status** do registro, não à data de criação. Use `status: "novo"` em `query_crm_leads`. Só use `since_days` quando o usuário pedir explicitamente um intervalo ("últimos 7 dias", "este mês" etc.).

### 3. Deploy

A edge function `ai-assistant` é redeployada automaticamente após a edição.

## Validação

Perguntar "tem algum lead novo?" — Marina deve chamar `query_crm_leads({ status: "novo" })` e listar os leads com status novo (ex.: Alexandre/DOF, Teste Deploy) sem aplicar filtro de 7 dias.