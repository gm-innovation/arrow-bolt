

## Correção de Permissão: "Conceder Conquista"

### Problema
O botão "Conceder Conquista" aparece para o perfil `admin` (Coordenador) porque a verificação atual na linha 44 do `FeedProfileSidebar.tsx` inclui `admin`:

```ts
const isAdminOrHR = role === 'admin' || role === 'hr' || role === 'super_admin';
```

### Solução
Alterar a verificação para permitir apenas `hr`, `director` e `super_admin`:

**`src/components/corp/FeedProfileSidebar.tsx`** (linha 44):
```ts
const canAwardBadge = role === 'hr' || role === 'director' || role === 'super_admin';
```

Usar `canAwardBadge` no lugar de `isAdminOrHR` na condição de renderização do `AwardBadgeDialog` (linha 212). Manter `isAdminOrHR` original para a permissão de finalizar enquete (linha 176), que faz sentido para admins.

