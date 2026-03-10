

## Plano: Criar Role `coordinator` sem Permissões Elevadas

### Contexto
O role `admin` atual é usado para coordenadores, mas lhes dá permissões elevadas em todo o sistema (aprovação de solicitações, acesso comercial, moderação de documentos, aba admin no corp, etc.). Coordenadores devem ser funcionários comuns que apenas gerenciam ordens de serviço nas suas páginas `/admin/*`.

### Alterações

**1. Migração de banco de dados**
- Adicionar `coordinator` ao enum `app_role`
- Migrar todos os `user_roles` com `admin` → `coordinator`

**2. Roteamento (`src/lib/roleRedirect.ts`, `src/App.tsx`)**
- Adicionar `coordinator: "/admin/dashboard"`
- Rotas `/admin/*`: `allowedRoles={['coordinator']}` em vez de `['admin']`
- Rotas `/commercial/*`: remover `admin` do `allowedRoles` (era `['commercial', 'admin']`)

**3. Corp — remover permissões elevadas de coordenador**
Coordenador passa a ser tratado como funcionário comum em todo o módulo corp:

| Arquivo | Mudança |
|---------|---------|
| `CorpLayout.tsx` | `isAdmin` não inclui mais `coordinator` — sem aba Admin/Relatórios |
| `ApprovalActions.tsx` | Remover `admin` de `isDirector`, `isFinanceiro`, `isSuprimentos`, `isHR` |
| `NewRequestDialog.tsx` | Remover `admin` de `isDirector` |
| `Requests.tsx` | Remover `admin` de `isAdmin` |
| `Documents.tsx` | Remover `admin` de `isHR` |
| `GroupInfoSidebar.tsx` | Remover `admin` de `isAdminOrHR` |
| `FeedProfileSidebar.tsx` | Remover `admin` de `isAdminOrHR` |

**4. Labels de role na UI (~10 arquivos)**
Trocar `admin: 'Administrador'` → `coordinator: 'Coordenador'` nos mapas de labels em:
- `UserMenu.tsx`, `FeedPostCard.tsx`, `FeedCreatePost.tsx`, `FeedProfileSidebar.tsx`, `FeedUserProfileCard.tsx`, `UserProfile.tsx`, `Users.tsx` (admin), `NewUser.tsx`, `EditUser.tsx`, `FeedMentionInput.tsx`

**5. Queries que buscam coordenadores**
Trocar `.eq("role", "admin")` → `.eq("role", "coordinator")`:
- `ManagerDashboardFilters.tsx`, `ManagerStats.tsx`, `CoordinatorFilter.tsx`, `ExportReportButton.tsx`, `useCoordinatorProductivity.ts`, `useManagerReports.ts`, `NewOrderForm.tsx`, `Coordinators.tsx`, `ReportsFilters.tsx`

**6. Edge functions (`create-user`, `update-user`, `delete-user`)**
- Substituir `admin` por `coordinator` nas verificações de permissão de gerenciamento de usuários
- Coordinator mantém permissão de criar/editar/deletar usuários da sua empresa (necessário para gestão de OS)
- Coordinator NÃO pode criar super_admin

**7. `ViewPurchaseRequestDialog.tsx` (Suprimentos)**
- Remover `admin` das verificações de `canApprove`

**8. `auto_assign_user_to_corp_group` trigger**
- Já é dinâmico (`NEW.role::text`), funciona automaticamente com `coordinator`

### Resultado
Coordenadores terão acesso apenas às suas páginas `/admin/*` para gestão de OS. Em todos os outros contextos (corp, comercial, aprovações), serão tratados como funcionários comuns.

