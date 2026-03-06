

## Plano: Corrigir botão Voltar e destaque do sidebar no perfil

### Problemas identificados

1. **Botão Voltar não funciona**: `navigate(-1)` pode falhar se o usuário abriu o perfil em nova aba ou não tem histórico. Precisa de fallback.

2. **Sidebar marca "Solicitações" em vez de "Feed"**: A lógica de active state na linha 281 do `DashboardLayout.tsx` diz:
   ```
   item.path === '/corp/dashboard' && location.pathname.startsWith('/corp/') && !location.pathname.startsWith('/corp/feed')
   ```
   Como `/corp/profile/xxx` começa com `/corp/` e **não** começa com `/corp/feed`, a condição é `true` para "Solicitações". Falta excluir `/corp/profile` também.

### Mudanças

**`src/components/DashboardLayout.tsx`** (linhas 281 e 353 — mesma lógica duplicada):
- Adicionar `&& !location.pathname.startsWith('/corp/profile')` à condição do "Solicitações"
- Adicionar condição para que o item "Feed" (`/corp/feed`) também fique ativo quando a rota for `/corp/profile`

**`src/pages/corp/UserProfile.tsx`** (botão Voltar):
- Trocar `navigate(-1)` por `navigate('/corp/feed')` como destino fixo, já que o perfil é acessado a partir do feed

