# Realinhamento de Papéis (Roles)

## Entendimento correto

| Papel no sistema | Sinônimos aceitos na UI | Nível |
|---|---|---|
| `coordinator` | Gerente, Admin, Coordenador | Operacional (mesma pessoa) |
| `director` | Diretor | Estratégico |
| `super_admin` | Super Admin | Plataforma |

Hoje o código trata `manager` e `director` como o mesmo bucket estratégico (via `roleRedirects.manager → /manager/dashboard` e `AccountLayoutRoute` mapeando `manager → director`), e `coordinator` como operacional isolado. Isso não bate com o que você descreveu — o correto é o inverso: **manager pertence ao grupo operacional (coordinator)**, e **director/super_admin ficam sozinhos no estratégico**.

## O que muda

### 1. Mapa de redirecionamento (`src/lib/roleRedirect.ts`)
- `manager` passa a redirecionar para `/admin/dashboard` (operacional), não para `/manager/dashboard`.
- `director` continua em `/manager/dashboard` (área estratégica).
- `super_admin` continua em `/super-admin/dashboard`.

### 2. Guards de rota (`src/App.tsx`)
- Todas as rotas `/admin/*` (operacionais) passam a aceitar `['coordinator','manager','super_admin']`.
- Rotas `/manager/*` (estratégicas) passam a aceitar apenas `['director','super_admin']` — remover `manager` daí.
- Ajustar `CorpRoute` e demais layouts que hoje agrupam `manager` com estratégico.

### 3. Layouts (`AccountLayoutRoute`, `CorpRoute`)
- `roleToUserType.manager` → `"admin"` (não mais `"director"`), para que gerentes vejam a sidebar operacional.
- `director` permanece `"director"`.

### 4. Prioridade em `AuthContext.fetchUserRole`
- Ajustar a lista `priority` para refletir que `manager` é operacional: `['super_admin','director','coordinator','manager','hr',...]` — hoje `manager` está acima de `coordinator`, o que fará um usuário com ambas as roles cair em rota estratégica indevidamente.

### 5. Rótulos em PT-BR
- Onde a UI mostra "Gerente" para `director`, trocar por "Diretor". Onde mostra "Coordenador", aceitar também "Gerente/Admin" como sinônimos (labels, filtros de usuário, seletor de papéis no `EditUserDialog`).
- Não renomear o enum do banco (`app_role`) — só rótulos de apresentação.

### 6. Sidebar
- `manager` passa a receber a sidebar do coordenador (mesmos itens: OSs, Calendário, Transferências, etc.).
- `director` mantém a sidebar estratégica atual (`/manager/*`).

## Fora de escopo (não mexer agora)

- Não alterar RLS nem enum `app_role` no banco.
- Não migrar usuários existentes automaticamente entre roles — só mudar como o app roteia/renderiza.
- Não tocar em Comercial/Marketing/RH/Qualidade/Financeiro.

## Verificação após implementar

1. Login como usuário `manager` → cai em `/admin/dashboard` com sidebar operacional.
2. Login como `director` → cai em `/manager/dashboard` estratégico.
3. Login como `coordinator` → cai em `/admin/dashboard` (sem regressão).
4. Playwright: repetir a varredura de 27 rotas com um usuário `manager` para confirmar paridade com coordenador.

## Dúvida rápida antes de executar

Confirmar apenas uma coisa: quando você diz "Gerente = Admin = Coordenador", isso significa que a role de banco `manager` deve se comportar **idêntica** a `coordinator` (mesmas rotas, mesma sidebar, mesmas permissões RLS futuras)? Se sim, sigo com o plano acima. Se preferir, posso ir além e **deprecar** a role `manager` no futuro (migrando todos para `coordinator`) — mas isso ficaria como uma segunda onda, não neste passo.
