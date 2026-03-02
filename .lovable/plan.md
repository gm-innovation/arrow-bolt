

## Correção: Ambos os itens "Feed" e "Solicitações Corp" ficam ativos

### Causa
Na lógica de highlight do sidebar (linhas 281 e 353 do `DashboardLayout.tsx`), a condição especial `item.path === '/corp/dashboard' && location.pathname.startsWith('/corp/')` faz com que "Solicitações Corp" fique ativo em **qualquer** rota `/corp/*`, incluindo `/corp/feed`. Como "Feed" também fica ativo por match exato (`location.pathname === '/corp/feed'`), ambos ficam azuis.

### Correção
Alterar a condição para excluir `/corp/feed` do match genérico de "Solicitações Corp":

```
(item.path === '/corp/dashboard' && location.pathname.startsWith('/corp/') && !location.pathname.startsWith('/corp/feed'))
```

Isso se aplica em dois lugares: mobile menu (linha 281) e desktop sidebar (linha 353).

### Arquivo
- `src/components/DashboardLayout.tsx` — linhas 281 e 353

