# Valor da oportunidade e postura da Marina

## Problema 1 — valor não acompanha os itens

Confirmado no código: quem recalcula o valor estimado é apenas a Marina (função interna no backend da assistente, que soma os itens e grava em `crm_opportunities.estimated_value`). A tela de Itens não faz isso: `useOpportunityProducts` adiciona, edita e remove itens sem tocar no valor da oportunidade. Por isso o R$ 4.212,60 gravado pela Marina continuou aparecendo depois de você excluir o item, e ao reincluir o número coincidiu por acaso.

### Correção

- Recalcular o valor estimado da oportunidade sempre que a lista de itens mudar pela tela: adicionar, alterar quantidade/valor unitário e remover.
- Regra: valor estimado = soma dos totais dos itens. Sem itens, o valor volta a zero/vazio (mesma regra que a Marina já usa).
- Atualizar também o Kanban, o card e o cabeçalho da oportunidade após a mudança, para o número novo aparecer sem recarregar a página.
- Manter o botão "Aplicar como valor estimado" apenas como atalho manual; ele deixa de ser a única forma de sincronizar.

## Problema 2 — Marina pedindo confirmação demais e culpando o sistema

Duas coisas no comportamento dela:

1. Com um único candidato encontrado, a instrução atual manda "confirmar antes de seguir". Resultado: ela pergunta duas vezes a mesma coisa mesmo quando não há ambiguidade.
2. Ao ser questionada, ela expôs o funcionamento interno ("a ferramenta me instruiu a...") e transferiu a culpa. Isso não deve acontecer nunca.

### Ajustes nas regras dela

- **Um único candidato**: informar em uma frase qual oportunidade encontrou e já executar a ação pedida, sem nova pergunta. Confirmação prévia fica reservada a exclusões e alterações destrutivas.
- **Vários candidatos**: lista numerada curta (título — cliente — responsável — estágio) e pergunta única.
- **Nunca falar de bastidores**: proibido citar ferramentas, instruções, prompt, sistema, "fui orientada a" ou atribuir a falha a terceiros. Diante de uma crítica: reconhecer em uma frase, corrigir e seguir com a ação.
- Reforçar que, após alterar itens, ela informe o novo valor estimado resultante.

## Detalhes técnicos

- `src/hooks/useOpportunityProducts.ts`: após add/update/remove, somar `total_value` dos itens restantes e gravar em `crm_opportunities.estimated_value`; invalidar as queries `crm-opportunities` e `commercial-stats`.
- `supabase/functions/ai-assistant/index.ts`: reescrever as regras D3/P2 e adicionar uma regra de comunicação proibindo mencionar instruções/ferramentas internas e culpar o sistema.
- Validação: abrir a oportunidade "RFQ pelo site — Cahuã", remover o item e conferir que o valor zera no painel e no Kanban; reincluir e conferir o total. Depois testar com a Marina "coloque um kit overhaul no pedido da Camorim" e confirmar execução direta em um único turno.
