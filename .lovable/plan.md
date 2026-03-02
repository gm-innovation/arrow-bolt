

## Problema

As rotas Corp (`/corp/feed`, `/corp/requests`, etc.) usam `CorpRoute` que passa os children diretamente para `DashboardLayout`. Como os children são componentes lazy, eles suspendem sem um `Suspense` boundary, causando o erro: *"A component suspended while responding to synchronous input"*.

As rotas nested (quality, admin, etc.) funcionam porque o `DashboardLayout` renderiza `<Suspense><Outlet /></Suspense>` quando não recebe children. Mas as rotas Corp passam children explicitamente, então o `Suspense` do Outlet nunca é usado.

## Solução

**`src/components/corp/CorpRoute.tsx`** — Envolver `{children}` em `<Suspense fallback={<ContentSkeleton />}>` dentro do `DashboardLayout`, para todas as 3 variantes (`CorpRoute`, `CorpAdminRoute`, `CorpReportsRoute`).

Isso garante que os componentes lazy tenham um boundary de Suspense e o skeleton apareça na área de conteúdo enquanto carregam, sem quebrar a página.

