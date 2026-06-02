## Objetivo

Incluir na página `/carreiras/:slug` duas novas seções com conteúdo editável por empresa:
1. **Sobre / Cultura** — bloco institucional com missão, valores e descrição do ambiente
2. **Benefícios** — grid de cards com ícone, título e descrição

## Mudanças no banco

### Em `companies` (novos campos institucionais)
- `careers_about_title` (text) — título do bloco "Sobre"
- `careers_about_text` (text) — descrição livre (markdown simples / parágrafos)
- `careers_mission` (text)
- `careers_values` (text[]) — lista curta de valores

### Nova tabela `company_benefits`
Campos específicos do domínio:
- `company_id` (uuid, FK → companies, ON DELETE CASCADE)
- `title` (text, not null)
- `description` (text)
- `icon` (text) — nome de ícone do lucide-react (ex.: "Heart", "Home", "GraduationCap")
- `display_order` (int, default 0)
- `is_active` (boolean, default true)

**GRANTs**: `anon` SELECT (página é pública), `authenticated` CRUD, `service_role` ALL.

**RLS**:
- SELECT público quando `is_active = true` (página pública lê sem login)
- INSERT/UPDATE/DELETE: somente HR/Director/Coordinator/Super Admin da própria company (via `has_role` + `get_user_company_id`)

Mesma lógica RLS adicional para os novos campos de `companies` já existe (a tabela já tem políticas).

## Mudanças na UI pública

`src/pages/careers/PublicCareers.tsx`:
- Após o Hero e antes da lista de vagas, adicionar:
  - **Seção "Sobre"** (full-width, fundo alternado): título + parágrafo + grid pequeno de valores (chips/cards)
  - **Seção "Benefícios"** (grid 2/3/4 colunas responsivo): cards com ícone do lucide, título, descrição
- Esconder cada seção quando não houver conteúdo cadastrado (graceful empty state)
- Buscar via novo `useQuery` paralelo ao atual, filtrando `company_id` e `is_active`

## Mudanças no painel administrativo

Em `src/pages/admin/CompanySettings` (ou equivalente onde hoje se edita `public_site_slug`):
- Nova aba/seção **"Página de Carreiras"** com:
  - Campos institucionais (título, sobre, missão, valores como tag input)
  - Lista CRUD de benefícios (adicionar/editar/remover/reordenar) com seletor de ícone (subset de lucide-react: Heart, Home, GraduationCap, Coffee, Plane, Shield, Gift, Briefcase, Users, Activity, BookOpen, Wallet)

Acesso restrito a HR / Director / Super Admin.

## Fora do escopo (deixar para próxima iteração)
- Processo seletivo, depoimentos, FAQ
- Upload de imagens próprias por benefício (usaremos apenas ícone)
- Editor rich-text (apenas textarea com quebras de linha)

## Ordem de execução
1. Migração (campos em `companies` + tabela `company_benefits` com GRANTs e RLS)
2. UI pública lendo os novos dados
3. UI administrativa de edição
