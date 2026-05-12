# Mover "API & Integrações" do Diretor para o Super Admin

Tudo relacionado à infraestrutura técnica (API, chaves, integrações, documentação Swagger) deve ficar exclusivamente no Super Admin. Diretor não vê nada disso.

## Mudanças

### 1. Frontend

- **Mover componente**: `src/pages/manager/ApiDocs.tsx` → `src/pages/super-admin/ApiDocs.tsx` (mesma lógica, sem alteração de código).
- **Rotas (`src/App.tsx`)**:
  - Remover `/manager/api-docs` e seu lazy import `ManagerApiDocs`.
  - Adicionar `/super-admin/api-docs` no bloco `ProtectedRoute allowedRoles={['super_admin']}`.
- **Menu lateral (`src/components/DashboardLayout.tsx`)**:
  - Remover o item "API & Integrações" de `directorMenuItems`.
  - Adicionar o item ao menu do Super Admin apontando para `/super-admin/api-docs`.

### 2. Backend

- **Edge Function `api-keys-manage`**: hoje aceita `director` ou `super_admin`. Restringir somente a `super_admin`. Como super_admin é global, o body de criação passa a aceitar `company_id` (obrigatório).
- **Página de gestão**: ganha um seletor de empresa no diálogo "Nova integração" (Combobox listando `companies`) e mostra uma coluna "Empresa" + filtro na listagem.
- **RLS** das tabelas `api_integrations`, `api_request_logs` e `api_idempotency_keys`: remover as policies que dão acesso ao `director`. Manter apenas `super_admin` (acesso global a todas as empresas).

### 3. Documentação

- `docs/api/README.md`: trocar "Entre como Diretor ou Super Admin" por "Entre como Super Admin".

## Fora de escopo

- Visão somente-leitura para o Diretor da própria empresa (não foi pedido).
- Mover outros itens administrativos do Diretor — só o módulo técnico de API/Integrações sai daqui.
