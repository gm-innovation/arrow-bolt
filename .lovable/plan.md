

## Plano: Melhorar responsividade do Feed — layout adaptativo e correção mobile

### Problemas identificados

1. **Mobile**: tudo empilha verticalmente (`space-y-4`) sem ordem lógica — sidebar do perfil completa (com enquete, discussões, grupos, stats), seguida do feed, resultando em conteúdo misturado e confuso
2. **Desktop intermediário** (sidebar aberta ~1024px): `grid-cols-[260px_1fr_260px]` com larguras fixas comprime demais a coluna central
3. **Tablet** (~768-1024px): mesma grid fixa, sem breakpoint intermediário

### Mudanças

**`src/pages/corp/Feed.tsx`**:

1. **Mobile (< 768px)**: 
   - Mostrar apenas um card compacto do perfil (avatar, nome, badge, botão "Ver perfil") — sem enquete, discussões, stats
   - Feed ocupa 100% da largura
   - Esconder sidebar direita completamente (já faz isso)

2. **Tablet (768px–1279px)**: layout de 2 colunas
   - `grid-cols-[260px_1fr]` — sidebar esquerda + feed
   - Esconder sidebar direita

3. **Desktop (≥ 1280px)**: layout de 3 colunas
   - `grid-cols-[260px_1fr_260px]` — como está hoje

Implementação via classes Tailwind responsivas em vez do hook `isMobile`:
```
grid grid-cols-1 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_260px]
```

**`src/components/corp/FeedProfileSidebar.tsx`**:

4. Criar variante compacta para mobile:
   - Aceitar prop `compact?: boolean`
   - Quando `compact=true`: renderizar apenas avatar, nome, badge, nível e botão "Ver perfil" (sem enquete, discussões, grupos, stats)

**`src/pages/corp/Feed.tsx`** (ajuste mobile):

5. No mobile, renderizar `<FeedProfileSidebar profile={profile} role={userRole} compact />` 
6. Sidebar direita com `hidden xl:block`
7. Sidebar esquerda com classes responsivas adequadas

### Resultado
- Mobile: card perfil compacto + feed limpo, sem bagunça
- Tablet: sidebar perfil + feed (2 colunas)
- Desktop grande: layout 3 colunas completo

