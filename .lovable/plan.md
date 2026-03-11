

## Plano: Propagar dados do Omie para o formulário de criação de OS

### Problema
O `handleOmieImport` em `NewOrderDialog` só seta `orderNumber`. Os dados de cliente, embarcação, descrição etc. não chegam ao `NewOrderForm`, que tem seu próprio `useForm` interno.

### Solução
Passar os dados importados do Omie como nova prop `omieImportData` para `NewOrderForm`, que usará um `useEffect` para auto-preencher campos.

Da imagem do Omie, a "Descrição Detalhada do Serviço" contém informações estruturadas (embarcação, equipe, local, escopo). O backend vai extrair os itens de serviço (`ServicosPrestados`) e retornar a descrição detalhada para preenchimento.

### Alterações

**1. Backend (`supabase/functions/omie-proxy/index.ts`)**
- Em `handleConsultOrder`, além do `localClient`, também buscar a embarcação local pelo nome extraído da descrição do serviço (`ServicosPrestados[0].cDescricao` contém "Embarcação: NOME")
- Buscar na tabela `vessels` onde `name ILIKE nomeEmbarcação` e `client_id = localClient.id`
- Retornar campo extra `localVessel: { id, name }` e `serviceDescription` (texto completo da descrição)

**2. `OmieImportDialog.tsx`**
- Expandir interface `onSelectOrder` para incluir `localVesselId`, `description`, `serviceDescription`
- No `handleImport`, passar esses dados extras
- Exibir embarcação e descrição resumida no preview

**3. `NewOrderDialog.tsx`**
- Criar estado `omieImportData` com todos os dados importados
- `handleOmieImport`: salvar tudo no estado (não só orderNumber)
- Passar `omieImportData` como prop para `NewOrderForm`

**4. `NewOrderForm.tsx`**
- Nova prop opcional `omieImportData?: { localClientId?: string; localVesselId?: string; omieOsId?: number; omieIntegrationCode?: string; description?: string }`
- `useEffect` ao receber `omieImportData`:
  - `form.setValue("clientId", localClientId)` → dispara fetch de embarcações/contatos via watcher existente
  - Após breve delay (para vessels carregarem): `form.setValue("vesselId", localVesselId)`
  - `form.setValue("description", description)`
- No `onSubmit` (criação): salvar `omie_os_id` e `omie_os_integration_code` no insert (campos já existem na tabela)

### Fluxo
```text
Omie API → handleConsultOrder enriquece com localClient + localVessel
         → OmieImportDialog exibe e passa tudo ao clicar "Importar"
         → NewOrderDialog salva em omieImportData state
         → NewOrderForm recebe prop, useEffect auto-preenche form
         → Cliente selecionado → embarcações carregam → vesselId setado
         → omie_os_id salvo no insert
```

