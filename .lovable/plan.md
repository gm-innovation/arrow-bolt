# Marina não consegue excluir férias: coluna errada na consulta

## Causa confirmada

A ferramenta de cancelamento consulta a tabela de solicitações de férias pedindo a coluna `sold_days`, que **não existe** ali — na tabela de solicitações o campo correto é `sell_days` (`sold_days` só existe nos períodos aquisitivos). Confirmei a lista de colunas no banco.

Com isso a consulta falha e o código devolve a dica genérica "Sem permissão para ver as férias deste colaborador" — daí a resposta da Marina na tela: "Parece que meu perfil não tem permissão para isso". Não é problema de permissão nem de RLS.

## O que muda

1. Corrigir o nome do campo na consulta e no resumo das programações ativas (`sell_days`, exibido como "dias vendidos").
2. Quando a consulta realmente falhar, a mensagem passa a informar o erro real em vez de afirmar falta de permissão — evita a Marina inventar diagnóstico errado.
3. Redeploy da função da assistente para valer no chat.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts` (`cancel_vacation_request`): trocar `sold_days` por `sell_days` no `select` (linha ~2415) e em `dias_vendidos` (linha ~2444); ajustar o `hint` do erro de consulta.
- Verificar o mesmo campo nas demais ferramentas de férias para não repetir o erro.
- Sem mudança de banco, RLS ou interface.
