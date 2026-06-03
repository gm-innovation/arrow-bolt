# Ajustes no módulo de RH

## 1. Renomear "Controle de Ponto" → "Controle de Atendimento"
- Atualizar o item do menu lateral do RH (DashboardLayout / sidebar do RH).
- Atualizar o título da página `src/pages/hr/TimeControl.tsx` ("Controle de Ponto" → "Controle de Atendimento") e textos visíveis correlatos ("Relatórios de Ponto" → "Relatórios de Atendimento", "Mês de referência" mantém).
- Rota `/hr/time-control` permanece (sem mudança técnica), apenas labels.

## 2. Unificar Feriados em "Escalas e Ausências" + incluir Home Office e Folgas
- Mover o conteúdo de `src/pages/hr/Holidays.tsx` para uma nova aba dentro de `src/pages/hr/Absences.tsx`.
- Estrutura de abas em Escalas e Ausências passa a ser: **Lista | Calendário | Feriados**, mantendo as sub-abas atuais (Ausências / Sobreavisos) dentro de "Lista".
- Adicionar dois novos tipos no cadastro de ausência (modal "Nova Ausência"): **Home Office** e **Folga**, junto aos tipos já existentes (férias, atestado, etc.). Cores/badges incluídos no mapeamento de tipos.
- Remover o item "Feriados" do menu lateral do RH.
- Rota `/hr/holidays` passa a redirecionar para `/hr/absences?tab=feriados` (preservar links externos).

## 3. Renomear "Universidade" → "Treinamentos"
- Apenas labels visíveis: item de menu do RH e do Corp (`Universidade` → `Treinamentos`), título das páginas `src/pages/hr/University.tsx` e `src/pages/corp/University.tsx`, "Minha Universidade" → "Meus Treinamentos" em `MyLearning.tsx`, breadcrumbs e textos relacionados ("Acessar Universidade" etc.).
- Rotas, tabelas e nomes de hooks/arquivos **não** mudam (sem refactor estrutural).

## 4. Nova área: Gestão de EPI (RH)
- Novo item no menu lateral do RH: "Gestão de EPI" → rota `/hr/epi`.
- Nova página `src/pages/hr/EPI.tsx` com abas:
  - **Catálogo de EPIs**: cadastro de itens (nome, CA, validade do CA, tamanho, estoque mínimo).
  - **Estoque**: entradas/saídas e saldo atual por item.
  - **Entregas**: registro de entrega ao colaborador (colaborador, EPI, quantidade, data, validade, assinatura/observação).
  - **Vencimentos**: relatório de CAs e entregas próximas do vencimento.
- Backend (Lovable Cloud): novas tabelas `epi_items`, `epi_stock_movements`, `epi_deliveries` com RLS (RH/Diretor CRUD; colaborador vê apenas as próprias entregas) e GRANTs padrão.

## 5. Nova área: Parcerias (RH)
- Novo item no menu lateral do RH: "Parcerias" → rota `/hr/partnerships`.
- Nova página `src/pages/hr/Partnerships.tsx` com listagem em cards/tabela:
  - Campos: nome do parceiro, categoria (saúde, educação, alimentação, lazer, etc.), descrição do benefício, contato, link, anexo/logo, vigência, status (ativa/inativa).
  - CRUD completo para RH/Diretor; visualização para todos os colaboradores via `/corp/partnerships` (somente leitura, lista de benefícios disponíveis).
- Backend: tabela `hr_partnerships` + bucket `partnership-logos` (público), com RLS (RH/Diretor escrevem; autenticados leem ativos) e GRANTs.

## Detalhes técnicos
- Menu do RH: ajustar array de itens em `DashboardLayout.tsx` (ou no componente de sidebar específico do RH) — adicionar EPI e Parcerias, remover Feriados, renomear Controle de Ponto e Universidade.
- Tipos de ausência: ampliar enum/lista em `useAbsences.ts` e no formulário de nova ausência (incluir Home Office e Folga com cores próprias no calendário).
- Migrations seguem o padrão do projeto: CREATE TABLE → GRANT → ENABLE RLS → POLICIES; usar `has_role` para gates de RH/Diretor.
- Memória: atualizar `mem://index.md` mencionando renomeações (Controle de Atendimento, Treinamentos) e os novos módulos EPI e Parcerias.

## Fora de escopo
- Integração de EPI com NR-6/eSocial.
- Fluxo de aprovação de Home Office (apenas registro nesta fase).
- Portal público de Parcerias fora do app.
