# Programação de Férias pelo RH

Ajustar a tela Gestão de Férias para refletir que o RH é a autoridade que já conhece e aplica as regras da empresa.

## O que muda

1. **Botão e modal renomeados para o RH**
   - Na tela `/hr/vacations`, o botão passa a ser **"Programar Férias"** (ícone de calendário) e o título do modal **"Programar Férias"**, com subtítulo indicando que o registro é feito pelo RH em nome do colaborador.
   - O rótulo "+ Nova Solicitação" fica reservado para a futura área do colaborador (não construída nesta etapa).
   - O botão de confirmação passa a ser **"Programar e Aprovar"**.

2. **RH programa já aprovado, inclusive fora do padrão**
   - Registro feito por RH/Diretoria nasce com status **Aprovado**, mesmo quando é exceção (ex.: 14 dias de gozo).
   - A justificativa deixa de ser obrigatória para o RH; segue obrigatória para solicitações de colaboradores.
   - A solicitação continua marcada como **exceção** (badge "Exceção" na tabela) para histórico e auditoria, mas não passa pela etapa da Diretoria.
   - Os avisos de "depende de autorização da Diretoria" e "informe a justificativa" só aparecem quando quem registra não é RH/Diretoria. Para o RH, exibe-se um aviso informativo: fora do padrão, registrado sob responsabilidade do RH.
   - As validações legais permanecem para todos: data fim ≥ início, primeira parcela com 14 dias, parcelas seguintes com 5 dias, abono máximo de 10 dias.

3. **Paridade da Marina**
   - Quando o usuário da assistente é RH/Diretoria, exceções são gravadas como aprovadas sem exigir justificativa nem etapa de Diretoria; para os demais perfis, a regra atual (justificativa + Diretoria) continua valendo.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx`: rótulos do gatilho/modal/rodapé; `missingJustification` e mensagens de exceção condicionados a `!isHRUser`; `is_exception` continua sendo enviado.
- `src/hooks/useVacations.ts` (`useCreateVacationRequest`): quando há `created_by_hr_id`, o status resultante é `approved` mesmo com `is_exception = true` (o roteamento para `pending_director` fica só para solicitações de colaborador sem gestor).
- `supabase/functions/ai-assistant/tools.ts` (`request_vacation`): dispensar justificativa e a etapa `pending_director` quando `isHrLike(ctx.role)`; redeploy da função.
- `supabase/functions/ai-assistant/index.ts`: ajustar a regra V4 do bloco FÉRIAS para registrar essa distinção.
- Sem mudanças de banco de dados.
