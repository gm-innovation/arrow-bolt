## Objetivo

Mover toda a configuração de comportamento da Marina para a UI do Agente (Super Admin → Agente de IA), eliminando instruções de role hardcoded no edge function e gravando as instruções corretas no agente padrão Marina.

## Mudanças

### 1. Limpar instruções hardcoded no edge function
Arquivo: `supabase/functions/ai-assistant/index.ts`

- Substituir o mapa `DEFAULT_ROLE_INSTRUCTIONS` (linhas 13-25) por um objeto vazio com comentário deixando claro que tudo agora vem da UI (`ai_agents.behavior.role_instructions`).
- Na função `buildSystemPrompt` (linha 375), remover o exemplo "FAÇA: chama ferramenta com padrão últimos 7 dias", trocando por exemplo neutro que não enviesa o filtro temporal.
- Remover a "Regra 10" hardcoded (linha 383) sobre interpretação de "novo/novos". Esta regra passa a fazer parte das instruções de role salvas no banco (assim continua editável pelo usuário).

Resultado: o prompt do sistema vira só persona + lista de módulos + regras técnicas mínimas (não inventar dados, responder em pt-BR, usar markdown, executar ferramentas antes de negar informação). Tudo que é editorial/comportamental sai daqui.

### 2. Gravar instruções corretas no agente Marina via SQL
Atualizar `ai_agents.behavior.role_instructions` da linha onde `name = 'Marina'` com textos consistentes para cada role. Em todos os roles que tocam CRM (`commercial`, `coordinator`, `manager`, `director`, `super_admin`) incluir explicitamente:

> "novo / novos / lead novo / leads novos" se refere ao STATUS do funil. Use `status: "novo"` e NUNCA `since_days`. Só aplique `since_days` quando o usuário pedir período explícito ("últimos 7 dias", "este mês", "hoje").

Roles atualizados: `technician`, `coordinator`, `manager`, `director`, `hr`, `commercial`, `financeiro`, `qualidade`, `compras`. Mantém o tom "AJA, NÃO PERGUNTE" para os que precisam.

### 3. Reforço determinístico em `tools.ts` (sem hardcode comportamental)
Arquivo: `supabase/functions/ai-assistant/tools.ts`

- Manter a descrição do parâmetro `since_days` já reforçada (apenas para período explícito do usuário).
- Manter a descrição do `query_crm_leads` lembrando que "lead novo" = `status: 'novo'`.
Estas duas linhas são metadados da ferramenta (não instruções de comportamento), então continuam no código.

### 4. Validação
Após deploy automático do `ai-assistant`:
- Testar "tem algum lead novo pra mim?" como coordenador → Marina chama `query_crm_leads({ status: "novo" })`, sem `since_days`, e lista leads com status novo (ex.: Alexandre/DOF, Teste Deploy).
- Testar "leads dos últimos 7 dias" → Marina chama com `since_days: 7`.
- Testar "liste leads" sem qualificador → Marina chama sem filtro e devolve geral.

## Observação
Após esta mudança, qualquer ajuste futuro nas instruções da Marina deve ser feito pela tela Super Admin → Agente de IA → aba Comportamento → Instruções por role. O código não terá mais fallback textual.