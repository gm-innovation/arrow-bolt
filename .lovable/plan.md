

## Plano: Mesclar role "manager" em "director"

### Contexto
A área que estava aparecendo como "Gerente" (com Dashboard, Coordenadores, Ordens de Serviço, etc.) é na verdade a área da Diretoria. Não teremos role de gerência por enquanto.

### Alterações

**1. Atualizar rotas do manager para aceitar `director`** (src/App.tsx)
- Mudar `allowedRoles` das rotas `/manager/*` de `['manager']` para `['manager', 'director']`

**2. Atualizar redirecionamento do director** (src/lib/roleRedirect.ts)
- Mudar `director: "/corp/dashboard"` para `director: "/manager/dashboard"`

**3. Atualizar menu do director** (src/components/DashboardLayout.tsx)
- Substituir `directorMenuItems` (que só tem Feed e Solicitações) pelo mesmo conteúdo do `managerMenuItems` (Dashboard, Coordenadores, OS, Relatórios, Config. Medição, Feed, Solicitações)

**4. Atualizar labels de "Gerente" para "Diretor"** (src/components/UserMenu.tsx, DashboardLayout.tsx)
- Onde o userType `"director"` aparece, garantir que mostre "Diretor" (já está correto no UserMenu)
- No DashboardLayout, mapear `director` para usar os mesmos menu items do manager

**5. Atualizar mapeamento no CorpRoute** (src/components/corp/CorpRoute.tsx)
- `director` já mapeia para `"director"` userType — OK

**6. Atualizar roleToUserType no CorpRoute**
- Manter `director: "director"` mas garantir que o DashboardLayout trate `director` como tendo o menu completo

### Resumo
O director passará a ter acesso completo às mesmas telas do manager (Dashboard operacional, Coordenadores, Ordens de Serviço, Relatórios, Config. Medição), além de Feed e Solicitações Corp. A role `manager` continuará existindo no banco mas sem uso ativo.

