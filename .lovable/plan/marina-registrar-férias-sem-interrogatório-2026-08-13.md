# Marina: registrar férias sem interrogatório

O pedido da tela era completo e padrão ("Hugo Alexandre, 03/01/27, 20 dias vendendo 10"), e ainda assim a Marina: (1) pediu confirmação de algo que já estava explícito; (2) só foi procurar quem é o Hugo depois do "sim"; (3) listou candidatos que não têm nada a ver ("Alexandre Silva", "ALEXANDRE STARCK"); (4) chamou o usuário de "Recursos" (o nome do cadastro é "Recursos Humanos", que não é nome de pessoa).

## O que muda

1. **Resolver a pessoa antes de qualquer resumo.** Ao receber um pedido de férias com nome, a Marina identifica o colaborador primeiro. Se houver dúvida real, ela pergunta na mesma mensagem em que já mostra o resto entendido — nunca pergunta "quem é?" depois de o usuário ter dito "sim".

2. **Pedido padrão e completo executa direto.** Colaborador identificado sem ambiguidade + data de início + 20 dias com venda de 10 (ou 30 dias) = registra e responde com o que foi gravado (período, dias, abono, status). Confirmação prévia fica só para pedido incompleto, ambíguo ou fora do padrão (exceção).

3. **Desambiguação só quando é realmente ambíguo.** Quando um candidato é claramente o melhor (casamento muito superior aos demais), ela usa esse e segue, mencionando o nome completo cadastrado. A lista numerada aparece apenas quando dois ou mais nomes estão de fato próximos, e os nomes fracos não entram mais na lista.

4. **Tratamento pelo nome mais cuidadoso.** Cadastros que não são nome de pessoa (por exemplo "Recursos Humanos", "Financeiro", contas de setor) não geram saudação com "primeiro nome"; nesses casos ela fala sem apelidar o usuário.

## Detalhes técnicos

- `supabase/functions/ai-assistant/people.ts` (`searchPeople`): elevar o piso de score e aplicar corte relativo ao topo — descartar candidatos com score abaixo de ~70% do melhor; expor `dominant: boolean` (topo >= 0.85 e vantagem >= 0.2 sobre o segundo).
- `supabase/functions/ai-assistant/tools.ts`:
  - `find_person`: usar o corte acima; quando `dominant`, `instruction` passa a ser "use este user_id direto, sem perguntar"; lista numerada só quando há empate real.
  - `request_vacation`: descrição deixa de exigir confirmação universal — exigir confirmação apenas quando faltar dado, houver ambiguidade de pessoa ou o pedido for exceção; aceitar `employee_name` como alternativa a `employee_id`, resolvendo internamente por `searchPeople` e devolvendo a lista apenas em caso de empate.
- `supabase/functions/ai-assistant/index.ts` (bloco FÉRIAS e regras de confirmação): registrar a ordem obrigatória (resolver pessoa → classificar padrão/exceção → executar se padrão e completo) e proibir perguntar "quem é" após um "sim".
- Saudação: no bloco de preferências (`up.useName`), condicionar o uso do primeiro nome a o nome parecer nome de pessoa (descartar nomes de setor/genéricos).
- Redeploy da função `ai-assistant`. Sem mudanças de banco, RLS ou frontend.
