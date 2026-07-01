Plano de correção do seletor de participantes:

1. Ajustar o componente `AwarenessFormDialog`
   - Criar uma referência (`ref`) envolvendo o bloco de seleção de participantes internos.
   - Adicionar uma escuta de clique/pointer enquanto o seletor estiver aberto.
   - Se o clique acontecer fora desse bloco, fechar imediatamente o dropdown/lista de colaboradores.
   - Manter o comportamento atual quando o clique for dentro da lista, para continuar permitindo selecionar/remover participantes.

2. Fechamento adicional esperado
   - Fechar o dropdown ao pressionar `Escape`.
   - Fechar o dropdown ao registrar o evento ou ao fechar/cancelar o modal.
   - Limpar a busca ao fechar o dropdown, para não reabrir filtrado sem intenção.

3. Cuidados para não quebrar o que já foi corrigido
   - Não voltar a usar `Popover`, `Command` ou portal, pois isso causou os problemas anteriores de clique/z-index.
   - Manter a lista inline, apenas adicionando o comportamento de “clique fora para fechar”.
   - Não alterar banco de dados nem regras de negócio.

4. Validação
   - Abrir o modal de conscientização.
   - Abrir “Selecionar colaboradores...”.
   - Selecionar colaboradores e confirmar que continuam sendo adicionados.
   - Clicar em outros campos do modal, área vazia, participantes externos e botões do rodapé; a lista deve fechar.
   - Reabrir o seletor e confirmar que a lista aparece normalmente.