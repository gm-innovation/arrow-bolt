

## Universidade Corporativa — Plano de Implementação

Este é um módulo grande. Vamos implementá-lo em fases para garantir qualidade. A **Fase 1** será entregue agora.

---

### Estrutura de Dados (Migração SQL)

**Tabelas a criar:**

1. **`university_courses`** — Catálogo de cursos
   - `id`, `company_id`, `title`, `description`, `category`, `thumbnail_url`, `duration_minutes`, `is_published`, `created_by`, `created_at`, `updated_at`

2. **`university_modules`** — Módulos/aulas dentro de cada curso
   - `id`, `course_id`, `title`, `description`, `content_type` (video/pdf/text), `content_url`, `sort_order`, `duration_minutes`, `created_at`

3. **`university_trails`** — Trilhas de aprendizado
   - `id`, `company_id`, `title`, `description`, `is_published`, `created_by`, `created_at`

4. **`university_trail_courses`** — Cursos dentro de uma trilha (M:N com ordem)
   - `id`, `trail_id`, `course_id`, `sort_order`

5. **`university_enrollments`** — Matrícula/atribuição de cursos a colaboradores
   - `id`, `company_id`, `user_id`, `course_id`, `is_mandatory`, `assigned_by`, `status` (not_started/in_progress/completed), `started_at`, `completed_at`, `created_at`

6. **`university_progress`** — Progresso por módulo
   - `id`, `enrollment_id`, `module_id`, `completed`, `completed_at`

7. **`university_certificates`** — Certificados emitidos
   - `id`, `enrollment_id`, `user_id`, `course_id`, `issued_at`, `certificate_code`

**RLS:** Acesso por `company_id`. Gestão (INSERT/UPDATE/DELETE) restrita a RH via `has_role(auth.uid(), 'hr')`. Leitura para todos os colaboradores autenticados da mesma empresa.

**Storage:** Bucket `university-content` para vídeos, PDFs e thumbnails.

---

### Páginas e Componentes

**Para o RH (gestão):**
- `/hr/university` — Dashboard da universidade (cursos, trilhas, matrículas)
- `/hr/university/courses/new` — Criar/editar curso com módulos
- `/hr/university/trails` — Gerenciar trilhas
- `/hr/university/enrollments` — Atribuir cursos/trilhas a colaboradores (obrigatório ou opcional)

**Para todos os colaboradores (consumo):**
- `/corp/university` — Catálogo de cursos e trilhas disponíveis
- `/corp/university/course/:id` — Player de conteúdo (vídeos, PDFs) com progresso
- `/corp/university/my-learning` — Meus cursos, progresso e certificados

**Sidebar:** Adicionar "Universidade" com ícone `GraduationCap` em todos os menus de role.

---

### Fase 1 (esta implementação)

1. Criar todas as tabelas, RLS e bucket via migração
2. Criar hook `useUniversity.ts` com queries e mutations
3. Criar página de gestão RH (`/hr/university`) — listagem de cursos com CRUD
4. Criar página de catálogo para colaboradores (`/corp/university`)
5. Criar página de player/conteúdo (`/corp/university/course/:id`)
6. Adicionar rotas no `App.tsx` e itens no menu lateral
7. Criar página "Meu Aprendizado" com progresso e certificados

### Fases futuras
- Trilhas de aprendizado (agrupamento de cursos em sequência)
- Emissão automática de certificados em PDF
- Dashboard de métricas (cursos mais acessados, taxa de conclusão)
- Notificações de treinamentos pendentes

