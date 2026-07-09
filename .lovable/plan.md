## Problema

No CRM Comercial, ao abrir uma oportunidade existente (ex.: "RFQ pelo site — Cahuã"), o campo **Cliente** aparece vazio, mesmo com o registro "Camorim" existindo e visível na view `crm_client_options`.

**Causa raiz:** o `EditOpportunitySheet` (e o `NewOpportunityDialog`) usa um `<Select>` shadcn simples que recebe a lista completa de ~2.122 clientes de uma vez via `useCommercialClientOptions`. Com esse volume, o Radix Select trava a renderização das opções, e o `value` selecionado não encontra o `<SelectItem>` correspondente no momento da montagem — resultando em trigger vazio. O mesmo problema afeta a criação (dropdown lento/vazio) e o seletor de Comprador quando dependente do cliente.

O módulo Admin/Ordens de Serviço já resolveu isso com o componente `ClientSearchCombobox`, que faz busca server-side na view `crm_client_options` e resolve o rótulo do cliente selecionado por `id`.

## Plano

Padronizar o seletor de cliente do módulo Comercial usando o mesmo combobox server-side já validado em OS.

### 1. Generalizar o `ClientSearchCombobox`
- Mover/renomear (ou reexportar) `src/components/admin/orders/ClientSearchCombobox.tsx` para um local compartilhado: `src/components/shared/ClientSearchCombobox.tsx`.
- Tornar `companyId` opcional: quando ausente, usar o `profile.company_id` do `AuthContext` (evita props redundantes no CRM).
- Manter o comportamento atual: busca por 2+ caracteres, badges de grupo/pai, resolução do rótulo por `id`.

### 2. Substituir o Select de Cliente no CRM
Arquivos a atualizar (trocar `<Select>` de cliente pelo novo combobox):
- `src/components/commercial/opportunities/EditOpportunitySheet.tsx` (linha ~231).
- `src/components/commercial/opportunities/NewOpportunityDialog.tsx` (linha ~113).

O comportamento de `onValueChange` continua o mesmo: atualiza `client_id` e limpa `buyer_id`.

### 3. Ajustar carregamento de rótulo em modo edição
Garantir que, ao abrir o sheet com um `client_id` já persistido, o combobox exiba o nome imediatamente (o próprio componente já faz `select name from crm_client_options where id = value`).

### 4. Deixar `useCommercialClientOptions` só para casos que realmente precisam da lista pré-carregada
- Manter o hook (usado em filtros/tabelas), mas remover a passagem de `clients` como prop nos dois componentes acima — o combobox busca sozinho.
- Ajustar a assinatura dos componentes (`clients` deixa de ser obrigatório) e o `Opportunities.tsx` para não passar mais o array.

### 5. Validação
- Abrir a oportunidade "RFQ pelo site — Cahuã": campo deve exibir "Camorim".
- Criar nova oportunidade: buscar "cam" retorna a lista filtrada rapidamente.
- Confirmar que Comprador continua sendo filtrado por `client_id` selecionado.

### Fora de escopo
- Nenhuma mudança em RLS, view `crm_client_options`, hooks de oportunidade ou lógica de negócio.
- Outros seletores de cliente do CRM (Tarefas, Recorrências, Vendas) — podem receber a mesma padronização em rodada seguinte se você quiser.
