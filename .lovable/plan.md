

## Trilhas de Aprendizado

As tabelas `university_trails` e `university_trail_courses` já existem no banco. Falta apenas o código (hooks + UI).

### Alterações

**1. `src/hooks/useUniversity.ts`** — Adicionar hooks para trilhas:
- `useUniversityTrails(publishedOnly?)` — listar trilhas da empresa
- `useUniversityTrail(trailId)` — trilha individual
- `useCreateTrail()` — criar trilha
- `useUpdateTrail()` — atualizar trilha
- `useDeleteTrail()` — deletar trilha
- `useTrailCourses(trailId)` — cursos da trilha com join em `university_courses`
- `useAddCourseToTrail()` — adicionar curso à trilha
- `useRemoveCourseFromTrail()` — remover curso da trilha

**2. `src/pages/hr/University.tsx`** — Nova aba "Trilhas":
- Adicionar tab "Trilhas" com ícone `Route` ao lado de Cursos e Matrículas
- Listar trilhas com cards (título, descrição, quantidade de cursos, status publicado/rascunho)
- Dialog para criar/editar trilha (título, descrição)
- Dialog para gerenciar cursos da trilha (adicionar cursos existentes com select, reordenar, remover)
- Botão publicar/despublicar trilha

**3. `src/pages/corp/University.tsx`** — Exibir trilhas para colaboradores:
- Adicionar tabs "Cursos" e "Trilhas" no catálogo
- Tab Trilhas mostra trilhas publicadas como cards
- Cada card mostra quantidade de cursos e duração total
- Clique navega para `/corp/university/trail/:id`

**4. `src/pages/corp/UniversityTrail.tsx`** — Nova página de trilha:
- Mostra título, descrição da trilha
- Lista cursos na ordem definida com progresso do usuário (se matriculado)
- Botão para iniciar/continuar cada curso da trilha

**5. `src/App.tsx`** — Registrar rota `/corp/university/trail/:id`

