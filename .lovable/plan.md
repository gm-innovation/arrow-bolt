# Walkthrough — Sub-passos por Elemento

## Problema

Hoje cada passo do walkthrough lista **todos os elementos da tela dentro de um único balão** (o card mostra "Botão Novo Usuário", "Filtros", "Tabela", "Ações da linha" numa lista). O usuário quer o oposto: **o spotlight deve mover-se de elemento em elemento**, com um balão dedicado por elemento explicando aquele item específico.

Ou seja: em `/super-admin/users`, em vez de 1 passo com 4 bullets, teremos:

1. Passo-pai "Usuários" (contexto geral rápido, aponta pra página)
2. Sub-passo → destaca **botão Novo Usuário**
3. Sub-passo → destaca **filtros**
4. Sub-passo → destaca **tabela**
5. Sub-passo → destaca **ações da linha**
6. Volta ao próximo passo-pai (ex: Empresas)

## Mudanças

### 1. Schema (`walkthrough_steps`)

Adicionar via migration:
- `parent_step_id uuid` — referência ao passo-pai (null = passo-pai).
- `is_substep boolean default false`.
- Nada mais muda (o `selector`, `route`, `title`, `intro`, `expected_outcome`, `tips` já existem e passam a ser usados **por elemento**).

Os campos `highlights` e `how_to_use` deixam de ser usados para listar elementos da tela (essa era a fonte do problema). Ficam disponíveis apenas para casos onde faz sentido listar micro-detalhes de um único elemento.

### 2. `data-tour` nos elementos

Adicionar atributos `data-tour="users-new"`, `data-tour="users-filters"`, `data-tour="users-table"`, `data-tour="users-row-actions"` etc. nos componentes das páginas cobertas, começando pelo Super Admin:

- `/super-admin/dashboard` — KPIs, gráficos, atalhos
- `/super-admin/companies` — botão nova empresa, filtros, tabela, ações
- `/super-admin/users` — botão novo, filtros, tabela, ações
- `/super-admin/pm-dashboard` — abas Overview, OST, IA & Impacto, Histórico
- `/super-admin/roadmap` — colunas, cards, drag
- `/super-admin/walkthroughs` — lista, editor
- `/super-admin/ai-management` — abas Identidade, Treinamento, Escopo, Ações
- `/super-admin/subscriptions`, `/super-admin/settings`, `/super-admin/profile`

Seletores dos sub-passos usam `[data-tour="..."]`.

### 3. `WalkthroughContext` — ordem achatada

Ao carregar `walkthrough_steps` de um script, montar a sequência: para cada passo-pai (na `order_index`), inserir os sub-passos (filtrados por `parent_step_id` e ordenados). O overlay já itera linearmente pela lista, então **nada muda no overlay** além de renderizar sub-passos com um estilo levemente mais compacto.

### 4. Overlay

- Sub-passo mostra breadcrumb pequeno "Usuários › Botão Novo Usuário" no topo.
- Corpo: `intro` (uma frase) + opcional `expected_outcome` / `tips`. Sem mais listas de "Nesta tela você vê".
- Contador continua "Passo N de Total" (contando pai+sub-passos).

### 5. Editor Super Admin (`/super-admin/walkthroughs`)

- Cada passo-pai renderiza uma seção com seus sub-passos aninhados abaixo.
- Botão "Adicionar sub-passo" dentro do pai.
- Reordenação dentro do escopo (pai só entre pais, sub-passo só entre seus irmãos).
- Campos por sub-passo: `title`, `selector` (com sugestão `[data-tour="..."]`), `intro`, `expected_outcome`, `tips`.

### 6. Reescrita do roteiro `super_admin`

Repopular via migration:
- 10 passos-pai (um por rota do Super Admin).
- ~4-6 sub-passos por rota, um por elemento visível relevante.
- Total estimado: ~55 passos (contra 12 atuais).

Os outros 9 roteiros permanecem com o formato antigo (passo-pai só, sem sub-passos) até serem reescritos em ondas seguintes.

## Detalhes técnicos

- Migration nova (adiciona colunas + reescreve steps do script `super_admin`). Steps antigos do super_admin são deletados antes da reinserção.
- Sub-passos herdam `route` do pai por padrão; podem sobrescrever se necessário.
- Se um sub-passo não encontrar o `data-tour` no DOM em 3s, é pulado silenciosamente (evita travar o tour).
- Nada muda em RLS/grants — colunas novas herdam as policies existentes.

## Escopo desta entrega

1. Migration (colunas + reescrita `super_admin`).
2. `data-tour` em todas as páginas do Super Admin.
3. Ajuste no `WalkthroughContext` para achatar pai+sub-passos.
4. Ajustes visuais no `WalkthroughOverlay` (breadcrumb, sem listas grandes).
5. Editor com aninhamento pai/sub-passo.

Os 9 outros roteiros ficam para ondas seguintes.

Confirma seguir?
