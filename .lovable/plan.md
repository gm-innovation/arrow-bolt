# Marina: avisar conflito de período e salvar as férias na empresa certa

## O que está acontecendo (verificado no banco)

A programação do Hugo **foi gravada**: 03/01/2027 a 22/01/2027, 20 dias de gozo + 10 vendidos, status Aprovada. O problema é que a linha ficou com a **empresa em branco** (`company_id` nulo), e a tela de Férias só lista programações da empresa do usuário logado — por isso ela não aparece na grade de 2027 nem na aba Solicitações. A mesma falha vale para qualquer programação criada pela Marina.

Além disso, a ferramenta de férias da Marina grava direto sem olhar quem mais está de férias no mesmo intervalo — em janeiro/2027 já existem outras programações (ex.: Ismael da Rocha Tostes, 04/01 a 02/02).

## O que muda

1. **Gravar na empresa correta**: a programação passa a herdar a empresa do colaborador (ou a do usuário logado), então aparece imediatamente na grade e nas listas.

2. **Corrigir a programação do Hugo** (e qualquer outra órfã): preencher a empresa nas linhas já criadas pela Marina, para que voltem a aparecer no front.

3. **Aviso de conflito antes de gravar**: antes de criar, a Marina verifica quem já tem férias sobrepostas no período e se o mês estoura os limites da empresa (colaboradores por mês / técnicos simultâneos). Se houver conflito, ela **não grava**: responde com quem conflita, as datas e os dias de sobreposição, e pergunta se agenda mesmo assim.

4. **Confirmação explícita**: se o usuário disser para agendar mesmo assim, a Marina repete a chamada com a confirmação e grava — o conflito continua sendo registrado pelo motor de regras para o RH ver na tela.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`, `request_vacation`:
  - incluir `company_id` no payload (empresa do `profiles` do colaborador, com fallback em `ctx.companyId`);
  - antes do insert, consultar `hr_vacation_requests` ativos com sobreposição de datas (`start_date <= end` e `end_date >= start`) e as regras em `hr_vacation_rules` (limite mensal e técnicos simultâneos);
  - quando houver sobreposição/estouro e o novo argumento `confirm_conflict` não for `true`, retornar `requires_confirmation` com a lista de colegas, período e dias de interseção, sem gravar;
  - novo parâmetro `confirm_conflict: boolean` na definição da tool.
- `supabase/functions/ai-assistant/index.ts`: regra no bloco FÉRIAS — apresentar os conflitos em texto simples e só reexecutar com `confirm_conflict` após o "pode agendar mesmo assim".
- Dado: `UPDATE hr_vacation_requests SET company_id = <empresa do colaborador> WHERE company_id IS NULL`.
- Sem mudança de schema, RLS ou frontend.
