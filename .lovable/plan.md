Vou corrigir o seletor de cliente dentro do modal de conversão com uma abordagem mais robusta:

1. **Trocar o Popover por uma lista embutida no próprio modal**
   - Evita conflito de camadas/foco entre `Dialog` e `Popover`, que é a causa provável de clique e rolagem não funcionarem.
   - A busca fica sempre visível abaixo do campo de cliente.

2. **Garantir rolagem real da lista**
   - Usar um container com altura máxima fixa e `overflow-y-auto` dentro do `DialogContent`.
   - Manter os resultados como botões nativos, sem `Command`/Popover.

3. **Garantir seleção imediata**
   - Ao clicar em uma empresa, atualizar `clientId`, mostrar o nome selecionado e liberar o botão “Criar oportunidade”.
   - Exibir estado selecionado com check visual.

4. **Limpeza técnica pequena**
   - Remover imports/estado não utilizados do Popover/Command.
   - Adicionar descrição acessível ao modal para eliminar o warning de `DialogContent` sem descrição.

**Arquivos previstos:** `src/pages/commercial/SiteLeads.tsx`.