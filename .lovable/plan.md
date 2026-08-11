# Corrigir o valor da oportunidade em todas as telas

## Diagnóstico confirmado

- A oportunidade **“RFQ pelo site — Cahuã”** está correta no banco neste momento: **2 itens** somando **R$ 8.425,20**, e `estimated_value` também está em **R$ 8.425,20**.
- A tela recarrega a lista de oportunidades após alterar itens, mas o painel aberto mantém uma **cópia antiga** da oportunidade em estado local. Por isso o total dos itens muda, enquanto o cabeçalho do painel pode continuar com “—” ou outro valor anterior.
- Kanban, indicadores, relatórios e detalhes do cliente leem `crm_opportunities.estimated_value`. Hoje esse campo é recalculado separadamente pela interface e pela Marina; não existe um gatilho no banco garantindo a regra para todos os caminhos. A API pública, por exemplo, também cria itens sem recalcular esse total.

## Implementação

1. **Centralizar a regra no banco**
   - Criar uma função e gatilho para recalcular `crm_opportunities.estimated_value` após qualquer `INSERT`, `UPDATE` ou `DELETE` em `crm_opportunity_products`.
   - Somar os `total_value` existentes e gravar **zero quando não houver itens**.
   - Cobrir também eventual transferência de um item entre oportunidades, atualizando a oportunidade antiga e a nova.
   - Dessa forma, interface, Marina, API pública e futuras integrações passam a obedecer à mesma regra automaticamente.

2. **Atualizar imediatamente o estado da interface**
   - Após adicionar, editar ou remover um item, atualizar/inutilizar de forma consistente as consultas de produtos, oportunidades e estatísticas comerciais.
   - Fazer o painel aberto acompanhar a versão mais recente da oportunidade retornada pela consulta, em vez de continuar exibindo o objeto capturado no momento do clique.
   - Sincronizar o formulário aberto com o novo valor sem apagar alterações que o usuário esteja fazendo nos demais campos.

3. **Eliminar a duplicação frágil**
   - Remover o recálculo manual cliente-a-cliente onde o gatilho já será a fonte da verdade.
   - Manter a Marina retornando o novo total ao usuário, mas lendo o valor consolidado depois da operação, sem implementar uma segunda regra de cálculo.
   - Ajustar o fluxo da API pública para persistir os valores dos itens de forma compatível com a regra central.

4. **Validar todos os pontos de exibição**
   - Testar adição, alteração de quantidade/valor e exclusão do último item.
   - Confirmar atualização simultânea no total da aba Itens, cabeçalho do painel, card e coluna do Kanban, KPI “Valor Total”, dashboard comercial, relatórios e detalhe do cliente.
   - Validar também uma inclusão/remoção feita pela Marina e confirmar que as telas refletem o novo valor após a atualização da consulta.

## Resultado esperado

O valor negociado terá uma única fonte da verdade e será atualizado em todos os lugares; ao excluir o último item, todos os pontos passarão a mostrar zero/sem valor, sem exigir fechar a tela ou atualizar o navegador.
