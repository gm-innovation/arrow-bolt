## Objetivo
Unificar o modal de cadastro/edição de clientes usando a versão mais completa (a do Admin/Coordenadores — `NewClientForm`) também na área Comercial, eliminando o `NewClientDialog` atual.

## Situação atual
- **Comercial** (`/commercial/clients`) usa `src/components/commercial/clients/NewClientDialog.tsx` — versão simplificada com abas (Empresa / Contatos / Embarcações).
- **Admin/Coordenadores** (`/admin/clients`) usa `src/components/admin/clients/NewClientForm.tsx` — versão rica com Identificação (Tipo de Pessoa, Segmento), múltiplas Razões Sociais/CNPJs, múltiplos Endereços com CEP, etc.
- Os dois gravam nas mesmas tabelas (`clients`, `client_legal_entities`, `client_addresses`, `crm_buyers`), mas com contratos diferentes.

## Plano de implementação

1. **Promover `NewClientForm` a componente compartilhado**
   - Mover `src/components/admin/clients/NewClientForm.tsx` para `src/components/clients/ClientFormDialog.tsx` (ou manter no lugar e apenas reimportar; a decisão fica no build).
   - Garantir que aceite `initialData` para modo edição (verificar se já suporta; caso não, adicionar).
   - Manter o mesmo contrato `onSave(data, buyer, legalEntities, addresses)` já usado no Comercial para reaproveitar a mutation existente.

2. **Substituir o modal no Comercial**
   - Em `src/pages/commercial/Clients.tsx`:
     - Remover import de `NewClientDialog`.
     - Importar o formulário unificado.
     - Ajustar o payload esperado (Tipo de Pessoa, Segmento, múltiplas Razões Sociais/CNPJs, múltiplos Endereços) e mapear para a mutation `saveMutation` já existente (que hoje já insere em `client_legal_entities` e `client_addresses`).
   - Manter o checkbox "Exibir este cadastro nos seletores do CRM" (`crm_visible`).

3. **Ajustar Admin para usar o mesmo componente**
   - Em `src/pages/admin/Clients.tsx`, apontar para o novo caminho compartilhado (se movido).

4. **Remover código morto**
   - Deletar `src/components/commercial/clients/NewClientDialog.tsx`.

5. **Verificações finais**
   - Confirmar que criação e edição funcionam nas duas rotas (`/commercial/clients` e `/admin/clients`).
   - Confirmar que o `crm_visible` e o comprador primário (`crm_buyers`) continuam sendo persistidos.

## Fora de escopo
- Alterações nas tabelas de banco.
- Mudanças no fluxo de conversão de lead em cliente (permanece usando o mesmo formulário unificado depois).
- Ajustes visuais além dos necessários para o formulário rico caber no modal.