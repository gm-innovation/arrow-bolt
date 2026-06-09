## Problema

`/quality/ncrs` renderiza `NCRsHub.tsx`, que exibe 4 abas internas (Não-Conformidades, Melhorias, Planos de Ação, Desvios). Isso causa:

1. **Duplicidade**: "Melhorias" aparece como aba no Hub e como sublink no SideMenu.
2. **Aba redundante**: "Não-Conformidades" é uma aba dentro da página "Não-Conformidades".
3. **Inconsistência**: "Planos de Ação" e "Desvios" só existem como aba — não viraram sublinks como o resto do refactor.

## Solução

Eliminar o `NCRsHub` (tabs) e promover todas as 4 telas a sublinks diretos do grupo "Melhoria e Conformidade".

### 1. SideMenu (`DashboardLayout.tsx`)

Grupo **Melhoria e Conformidade** passa de 3 para 5 sublinks:

```
Melhoria e Conformidade
 ├─ Não-Conformidades   → /quality/ncrs
 ├─ Melhorias           → /quality/improvements
 ├─ Planos de Ação      → /quality/action-plans
 ├─ Desvios             → /quality/deviations
 └─ Auditorias          → /quality/audits
```

### 2. Rotas (`App.tsx`)

- `/quality/ncrs` → renderizar `NCRs` direto (não mais `NCRsHub`).
- `/quality/action-plans` → renderizar `ActionPlans` (hoje redireciona p/ `?tab=`).
- `/quality/deviations` → renderizar `Deviations` (novo).
- Manter `/quality/improvements` como está.
- Redirects de retrocompatibilidade: `/quality/ncrs?tab=…` → rota direta correspondente (via componente leve ou simplesmente ignorar o query param, já que ninguém deve ter bookmark).

### 3. Limpeza

- Deletar `src/pages/quality/NCRsHub.tsx` (não mais usado).
- Remover import/lazy de `QualityNCRsHub` em `App.tsx`.

## Critérios de aceitação

- Sublink "Não-Conformidades" abre direto a lista (sem tabs no topo).
- "Planos de Ação" e "Desvios" acessíveis pelo SideMenu como sublinks.
- Nenhuma aba "Melhorias / Planos de Ação / Desvios" aparece dentro de `/quality/ncrs`.
- Build passa.
