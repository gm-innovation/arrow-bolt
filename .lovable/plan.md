## Plano

1. **Sincronizar nome e identidade**
   - Ajustar a aba **Identidade** para que ao alterar “Nome do agente”, o valor também seja gravado em `identity.name`.
   - Assim, qualquer parte do sistema que leia o nome pela identidade do agente receberá “Marina”.

2. **Corrigir leitura no modal do chat**
   - Atualizar o modal para priorizar o nome salvo corretamente, evitando manter fallback antigo como “NavalOS AI”.
   - Garantir que cabeçalho e mensagem de boas-vindas usem a mesma origem de nome.

3. **Atualizar cache após salvar**
   - Revisar a invalidação dos dados dos agentes para refletir a alteração imediatamente após salvar, sem precisar recarregar a página.

## Resultado esperado

Ao salvar “Marina” no gerenciador, o modal do assistente deve exibir “Marina” tanto no cabeçalho quanto na saudação inicial.