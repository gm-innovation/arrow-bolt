

## Corrigir sidebar remontando + loading com skeleton

### Problema 1 — Sidebar remonta
Cada rota tem seu próprio `<DashboardLayout>` como wrapper. Ao navegar, o React desmonta e remonta o layout inteiro (sidebar + header + conteúdo).

### Problema 2 — Loading lento e sem feedback visual
O `Suspense` envolve tudo, substituindo a tela inteira por um spinner genérico.

### Solução: Nested Routes + Skeleton Fallback

**1. `src/components/DashboardLayout.tsx`**
- Importar `Outlet` de `react-router-dom` e `Suspense` de React
- Criar componente `ContentSkeleton` usando o `Skeleton` existente (`@/components/ui/skeleton`) que simula o layout de uma página típica (header skeleton + cards skeleton + table skeleton)
- Quando `children` não for passado, renderizar `<Suspense fallback={<ContentSkeleton />}><Outlet /></Suspense>` na área de conteúdo (linha 446)
- Quando `children` for passado, manter comportamento atual (compatibilidade)

**2. `src/components/ProtectedRoute.tsx`**
- Suportar uso sem children (para layout routes): quando `children` não existir, renderizar `<Outlet />`

**3. `src/App.tsx`**
- Refatorar rotas para usar nested routes agrupadas por userType:
```text
<Route element={<ProtectedRoute allowedRoles={['qualidade']}><DashboardLayout userType="qualidade" /></ProtectedRoute>}>
  <Route path="/quality/dashboard" element={<QualityDashboard />} />
  <Route path="/quality/ncrs" element={<QualityNCRs />} />
  ...
</Route>
```
- Aplicar o mesmo padrão para todos os grupos: super-admin, admin, manager, tech, hr, commercial, corp, supplies, quality, finance
- Remover o `<Suspense>` de nível superior (cada layout terá o seu próprio com skeleton)
- Manter `Suspense` com spinner apenas para rotas de auth (login, signup, etc.)

**4. `ContentSkeleton` (dentro de DashboardLayout)**
- Usar `Skeleton` de `@/components/ui/skeleton`
- Layout: barra de título (skeleton h-6 w-48) + grid de 4 cards (skeleton h-24) + bloco de conteúdo (skeleton h-64)
- Aparece apenas na área de conteúdo, sidebar e header permanecem visíveis e interativos

### Resultado
- Sidebar nunca desmonta ao navegar entre páginas do mesmo módulo
- Skeleton aparece apenas na área de conteúdo durante carregamento lazy
- Feedback visual imediato e profissional em vez de spinner genérico

