## Problema

1. A página pública `/carreiras/:slug` está pobre visualmente — sem hero, sem presença de marca.
2. A logo da empresa não aparece porque `companies.logo_url` da Lecsor está vazio no banco. Hoje só é editável via Super Admin → Empresas, o que o RH não acessa.

## Direção visual escolhida

"Maritime Portal" — paleta Navy Trust (`#0f1b3d`, `#1e3a5f`, `#3b6fa0`, `#e8edf3`), tipografia Space Grotesk (heading) + DM Sans (body), layout hero-grid. Energia marítima-corporativa, sóbria, confiável.

## Escopo

### 1. Upload da logo pelo RH (`src/pages/hr/Recruitment.tsx`)
- Novo card "Identidade visual" ao lado do card de domínio público.
- Mostra logo atual (se houver) e botão de upload (input file overlay, padrão do projeto, com `sanitizeFilename`).
- Faz upload para bucket público `corp-documents` em `{company_id}/branding/logo-{timestamp}.{ext}` e grava o path em `companies.logo_url`.
- Validações: tipo (png/jpg/svg/webp), tamanho ≤ 2MB.
- Sem migração de schema — coluna já existe.

### 2. Redesign de `src/pages/careers/PublicCareers.tsx`
Reescrever o JSX da listagem aplicando exatamente a composição da direção escolhida, mantendo TODA a lógica atual (fetch via edge function, form de candidatura, honeypot, preselected, estados loading/done/indisponível).

Estrutura nova (somente listagem; o formulário continua igual):
- **Nav** branco com selo Lecsor (logo da empresa quando existir + nome) e link "Voltar para o site" só se `companies.website` existir.
- **Hero** `bg-[#0f1b3d]` com grid SVG de fundo, badge "Carreiras Técnicas", título grande Space Grotesk com palavra em destaque azul claro, subtítulo curto.
- **Toolbar de vagas** com título "Vagas abertas" + filtros por `area` (Todas / por área distinta extraída das openings).
- **Grid de cards** 1/2/3 colunas: borda superior colorida (alternada `#3b6fa0`/`#1e3a5f`), badge da área no canto, código curto (`o.id.slice(0,4)`), título, location e employment_type com ícones, botão "Candidatar-se" full-width navy → hover azul claro.
- **Bloco "Candidatura espontânea"** em card navy arredondado com brilho radial sutil, CTA `#3b6fa0`.
- **Footer** mínimo com copyright + nome da empresa dinâmico.
- Cores INLINE com os hex da paleta travada (sem semantic tokens) porque a página pública é stand-alone e não deve herdar o tema do app.
- Fontes carregadas via `<link>` no topo do componente (mesma técnica do protótipo).

### 3. Telas de erro/sucesso/loading
- "Página indisponível", "Candidatura enviada" e skeleton ganham o mesmo fundo `#e8edf3` e tipografia Space Grotesk/DM Sans para coerência.

## Fora de escopo

- Não criar tabelas, RLS, triggers, edge functions novas.
- Não tocar no formulário de candidatura (apenas no contêiner externo se o estado `showForm` ficar dentro do mesmo layout — manter o card branco atual, sem redesign do form).
- Não adicionar seção de benefícios/pilares estáticos (sem dado real no banco para isso).

## Arquivos afetados

- `src/pages/careers/PublicCareers.tsx` — redesign completo da listagem.
- `src/pages/hr/Recruitment.tsx` — novo card de upload de logo.
