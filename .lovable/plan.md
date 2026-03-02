

## Tres mudancas necessarias

### 1. AwardBadgeDialog — Remover tipos de tempo de empresa + adicionar seletor de icone

No `AwardBadgeDialog.tsx`:
- Remover `tenure_1y`, `tenure_5y`, `tenure_10y` do `BADGE_TYPES` (serao automaticos)
- Manter apenas: Meta Alcancada, Projeto Finalizado, Curso Finalizado, Personalizada
- Quando `badgeType === 'custom'`, exibir grid de emojis para o usuario escolher o icone (ex: ⭐🏆🎯🚀💎🔥👑✨💡🎖️🥇🏅🎉💪🌟)
- Adicionar estado `customIcon` e usar no insert

### 2. Aniversarios de Empresa — Card na sidebar direita

No `FeedRightSidebar.tsx`:
- Adicionar query para buscar profiles com `hire_date` onde mes/dia de `hire_date` cai no mes atual
- Calcular anos de empresa para cada um
- Renderizar card "Aniversarios de Empresa" com icone 🎖️, mostrando nome + "X anos" entre o card de Badges e o de Aniversariantes

### 3. Aniversarios de Empresa — Card no feed central (hoje)

No `Feed.tsx` / novo componente `FeedWorkAnniversaryCard.tsx`:
- Similar ao `FeedBirthdayCard`, filtrar profiles cujo `hire_date` cai hoje (mes+dia)
- Exibir card destacado: "🎖️ Aniversario de Empresa!" com nome e anos
- Posicionar no feed logo apos o card de aniversariantes do dia

