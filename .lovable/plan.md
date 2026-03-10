

## Plano: Transferências múltiplas no mesmo modal

### Problema
Atualmente o modal só permite uma transferência por vez e fecha ao confirmar. Se o usuário precisa substituir mais de um técnico, precisa reabrir o modal.

### Solução
Converter o fluxo para suportar múltiplas transferências em fila. O usuário adiciona transferências uma a uma, vê um resumo de todas as pendentes, e confirma tudo de uma vez.

### Alterações em `TransferTechniciansDialog.tsx`

**Novo state**: `transfers: Array<{ fromTechId, toTechId, toTechName }>` para acumular transferências pendentes.

**Fluxo do usuário**:
1. Vê a equipe atual (seção "Equipe Atual" permanece)
2. Seleciona técnico a substituir + novo técnico
3. Clica em **"Adicionar Transferência"** -- a transferência é adicionada à lista pendente
4. A seção "Equipe Atual" atualiza visualmente mostrando quem já está marcado para troca (com indicação visual, ex: nome riscado + seta para novo nome)
5. Pode repetir o processo para outros técnicos
6. Vê um resumo de todas as transferências pendentes, com opção de remover individualmente
7. Clica **"Confirmar Transferências"** para executar todas de uma vez

**Detalhes técnicos**:
- `transfers` state: `{ fromTechId: string, toTechId: string, toTechName: string, fromName: string, isLead: boolean, tasks: Task[] }[]`
- Técnicos já adicionados a uma transferência ficam desabilitados no dropdown "Técnico a substituir"
- Ao adicionar, limpar os selects para permitir nova seleção
- O `handleTransfer` itera sobre o array `transfers` executando a lógica existente para cada um
- Não fechar o modal após sucesso de uma transferência individual -- só fechar no final
- Botão "Adicionar Transferência" (secundário) + botão "Confirmar Transferências" (primário)
- Lista de transferências pendentes com badge mostrando "De X → Para Y" e botão de remover (X)
- Campo de motivo único (aplicado a todas as transferências)

