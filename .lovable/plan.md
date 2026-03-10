

## Plano: Integração com Omie ERP

### Escopo
1. Credenciais Omie por empresa (armazenadas no banco)
2. Edge function para proxy de chamadas à API do Omie
3. Sincronização de clientes (Omie → Sistema)
4. Consulta/importação de OS do Omie
5. Upload de relatórios/medições como anexos na OS do Omie
6. Aba "Omie" nas Configurações do admin
7. Logs de sincronização (reusa `crm_integration_logs`)

### Migração SQL

```sql
-- Credenciais Omie na tabela companies
ALTER TABLE companies ADD COLUMN omie_app_key text;
ALTER TABLE companies ADD COLUMN omie_app_secret text;
ALTER TABLE companies ADD COLUMN omie_sync_enabled boolean DEFAULT false;

-- Vínculo Omie nas tabelas existentes
ALTER TABLE service_orders ADD COLUMN omie_os_id bigint;
ALTER TABLE service_orders ADD COLUMN omie_os_integration_code text;
ALTER TABLE clients ADD COLUMN omie_client_id bigint;
```

### Edge Function: `omie-proxy`

Uma única edge function que serve como proxy para a API do Omie. Recebe `action` no body e roteia para o endpoint correto.

**Ações suportadas:**
- `list_clients` → `POST https://app.omie.com.br/api/v1/geral/clientes/` (`ListarClientes`)
- `list_orders` → `POST https://app.omie.com.br/api/v1/servicos/os/` (`ListarOS`)
- `consult_order` → `POST https://app.omie.com.br/api/v1/servicos/os/` (`ConsultarOS`)
- `attach_file` → `POST https://app.omie.com.br/api/v1/servicos/os/` (`IncluirAnexo`) - envia PDF base64
- `sync_clients` → busca todos clientes do Omie e upsert na tabela `clients`
- `test_connection` → chama `ListarClientes` com página 1 e 1 registro para validar credenciais

A function busca `omie_app_key` e `omie_app_secret` da tabela `companies` usando o `company_id` do usuário autenticado. Sem necessidade de secrets manuais.

### Frontend: Aba Omie nas Configurações

**Novo componente `OmieSettingsTab.tsx`:**
- Toggle ativar/desativar sincronização Omie
- Campos App Key e App Secret (salvos na tabela `companies`)
- Botão "Testar Conexão" (chama `omie-proxy` com action `test_connection`)
- Botão "Sincronizar Clientes" (chama `omie-proxy` com action `sync_clients`)
- Badge de status (conectado/erro)
- Logs recentes de sincronização (reusa `crm_integration_logs` com entity_type `omie`)

**Alteração em `Settings.tsx`:**
- Adicionar 4ª aba "Omie" com ícone `Link` no TabsList (grid-cols-4)

### Frontend: Importar OS do Omie

**No `NewOrderForm.tsx`:**
- Se `omie_sync_enabled`, mostrar botão "Importar do Omie" ao lado do campo Nº OS
- Abre dialog com lista de OS do Omie (chama `omie-proxy` com `list_orders`)
- Ao selecionar, preenche automaticamente: nº da OS, cliente (via `omie_client_id`), e salva `omie_os_id`/`omie_os_integration_code`

### Upload de Relatórios ao Omie

**Nos componentes de download de relatório (`ServiceOrderReports.tsx`):**
- Se a OS tem `omie_os_id`, após gerar PDF, oferecer botão "Enviar ao Omie"
- Converte PDF para base64 e chama `omie-proxy` com action `attach_file`
- Registra log de sincronização

### Arquivos criados/alterados
- **DB Migration**: adicionar colunas `omie_*` em `companies`, `service_orders`, `clients`
- **`supabase/functions/omie-proxy/index.ts`**: edge function proxy
- **`src/components/admin/settings/OmieSettingsTab.tsx`**: nova aba de config
- **`src/pages/admin/Settings.tsx`**: adicionar aba Omie
- **`src/hooks/useOmieIntegration.ts`**: hook para chamadas à edge function
- **`src/components/admin/orders/OmieImportDialog.tsx`**: dialog de importação de OS
- **`src/components/admin/orders/NewOrderForm.tsx`**: botão de importar OS do Omie
- **`src/components/manager/reports/ServiceOrderReports.tsx`**: botão enviar ao Omie

### Segurança
- Credenciais ficam no banco (colunas da empresa), não em secrets globais
- Edge function valida JWT e busca credenciais com base no `company_id` do perfil
- RLS existente protege acesso às colunas de credenciais (somente admin/manager da empresa)

