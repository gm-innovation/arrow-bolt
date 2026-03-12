

## Publicação no Feed e Badges ao Concluir Cursos/Trilhas

### 1. Auto-post no feed ao concluir curso/trilha

**`src/pages/corp/UniversityCourse.tsx`** — No `useEffect` que detecta conclusão (linha 49-54), após `updateStatus` e `issueCert`, inserir automaticamente um post no feed:

```ts
await supabase.from('corp_feed_posts').insert({
  company_id: enrollment.company_id,
  author_id: user.id,
  content: `🎓 Concluí o curso "${course.title}"!`,
  post_type: 'achievement',
});
```

**`src/pages/corp/UniversityTrail.tsx`** — Adicionar detecção de conclusão de trilha (todos os cursos completed). Quando `progressPercent === 100`, postar:

```ts
await supabase.from('corp_feed_posts').insert({
  company_id: ...,
  author_id: user.id,
  content: `🏆 Concluí a trilha "${trail.title}"!`,
  post_type: 'achievement',
});
```

### 2. Auto-award badges ao concluir curso/trilha

No mesmo fluxo de conclusão:

**Curso concluído** — Inserir badge automático:
```ts
await supabase.from('corp_badges').insert({
  company_id, user_id, badge_type: 'course_completed',
  title: `Curso: ${course.title}`, icon: '📚',
  category: 'manual', xp_value: 15,
  awarded_by: user.id, // auto-awarded
});
```

**Trilha concluída** — Badge com XP maior:
```ts
await supabase.from('corp_badges').insert({
  company_id, user_id, badge_type: 'trail_completed',
  title: `Trilha: ${trail.title}`, icon: '🎓',
  category: 'manual', xp_value: 50,
  awarded_by: user.id,
});
```

### 3. HR: Gestão de badges da Universidade

**`src/pages/hr/University.tsx`** — Adicionar uma 4ª aba "Conquistas" (`Award` icon) com:
- Listagem de badges emitidos por cursos/trilhas (`badge_type IN ('course_completed', 'trail_completed')`)
- Filtro por colaborador
- Possibilidade de remover badges indevidos
- Configuração de XP padrão por tipo (curso vs trilha)

### 4. Invalidar queries relevantes

Após criar post e badge, invalidar `corp-feed`, `corp-badges-recent`, `user-xp` para refletir imediatamente na UI.

### Arquivos alterados
- `src/pages/corp/UniversityCourse.tsx` — auto-post + auto-badge ao concluir curso
- `src/pages/corp/UniversityTrail.tsx` — detectar conclusão de trilha + auto-post + auto-badge
- `src/pages/hr/University.tsx` — nova aba "Conquistas" para gestão
- `src/hooks/useUniversity.ts` — extrair helper `publishCompletionToFeed` e `awardCompletionBadge`

