# Refatoração do SideMenu da Qualidade

Reorganizar o menu lateral da Qualidade em **grupos pai com sublinks**, eliminar a obrigatoriedade de "entrar em hub → escolher aba" e criar rotas diretas para as abas mais usadas — sem remover funcionalidades.

## 1. Nova estrutura do menu (perfil `qualidade`)

```
Dashboard                         /quality/dashboard
Documentação                      (grupo)
 ├─ Documentos                    /quality/documents
 ├─ Normas                        /quality/documents/norms
 ├─ Termos                        /quality/documents/terms
 └─ Lista Mestra                  /quality/documents/master-list
Melhoria e Conformidade           (grupo)
 ├─ Não-Conformidades             /quality/ncrs
 ├─ Auditorias                    /quality/audits
 └─ Melhorias                     /quality/improvements
Estratégia e Gestão               (grupo)
 ├─ Riscos & Oportunidades        /quality/risks
 ├─ Planejamento                  (subgrupo)
 │   ├─ Objetivos                 /quality/planning/objectives
 │   ├─ Indicadores               /quality/planning/indicators
 │   └─ Mudanças                  /quality/planning/changes
 ├─ Partes Interessadas           /quality/interested-parties
 └─ Análise Crítica               /quality/management-review
Operação da Qualidade             (grupo)
 ├─ Provedores Externos           /quality/suppliers
 ├─ Calibração                    /quality/devices
 └─ Voz do Cliente                /quality/voice-of-customer
Competências e Pessoas            (grupo)
 ├─ Matriz de Competências        /quality/competencies/matrix
 ├─ Programa Anual                /quality/competencies/program
 ├─ Conscientização               /quality/competencies/awareness
 └─ Conhecimento                  /quality/knowledge
Comunicação                       /quality/communication
Homologação                       /quality/homologation
Configurações                     /quality/settings
Feed                              /corp/feed         (inalterado)
Solicitações Corp                 /corp/dashboard    (inalterado)
Treinamentos (Universidade)       /corp/university   (inalterado)
```

De **15** itens de primeiro nível para **9** (6 grupos + Comunicação/Homologação/Configurações) — Feed/Solicitações/Universidade intactos.

## 2. Regras explícitas (decisões finais)

**a) Lista Mestra não é entidade independente.**
`/quality/documents/master-list` renderiza apenas uma **visão consolidada/relatório** dos documentos controlados existentes (mesma fonte de `useQualityDocuments` / `useQualityMasterList`). **Não** criar tabela, hook ou CRUD próprios. Reaproveitar o componente `MasterList.tsx` já existente como visualização filtrada (status, tipo, próxima revisão).

**b) Planejamento: sem Tabs, somente rotas.**
`Planning.tsx` é fatiado em três componentes-página (`PlanningObjectives`, `PlanningIndicators`, `PlanningChanges`). As `Tabs` desaparecem da UI principal. Cada rota é o destino final — nada de `?tab=`. Decisão definitiva: **sem tabs, somente rotas.**

**c) Renomear "Treinamentos" para evitar colisão com Universidade.**
O sublink em "Competências e Pessoas" passa a chamar-se **"Matriz de Competências"** (rota `/quality/competencies/matrix`). Isso elimina ambiguidade com o item "Treinamentos (Universidade)" do menu corporativo. Mapeamento mental para o usuário:
- Universidade → cursos corporativos / trilhas / certificados.
- Qualidade → competências exigidas pela ISO 9001.

## 3. Quebra de hubs por abas em rotas diretas

- **Documentos** (`DocumentsHub`/`Documents.tsx`): Tabs internas (master/norms/terms) removidas. Cria wrappers de página `DocumentsNorms`, `DocumentsTerms`, `DocumentsMasterList` reutilizando os componentes existentes `NormsTab`, `TermsTab`, `MasterList`. `/quality/documents` mostra apenas a lista mestra de documentos controlados (sem tabs).
- **Planejamento** (`Planning.tsx`): extrair cada `TabsContent` em página própria; `Planning.tsx` vira layout/redirect para `objectives`.
- **Competências** (`CompetenciesHub`): Tabs removidas do fluxo principal; rotas dedicadas para matrix/program/awareness. Subpáginas pessoais (`me`, `acknowledgements`, `org`) continuam acessíveis por rota, mas saem do menu lateral da Qualidade.
- **NCRs**: menu aponta direto para `/quality/ncrs` e `/quality/improvements` (cada um em sua página).
- **Riscos**: Riscos, Partes Interessadas e Análise Crítica viram links diretos. Contexto/Processos/SWOT continuam no hub via `?tab=`, fora do menu principal.
- **VoiceOfCustomer**: mantém suas 4 abas internas (Visão geral / Campanhas / Reclamações / Sugestões) — apenas 1 link no menu.

Para cada rota nova: registrar `Route` em `App.tsx`. Manter `Navigate` das rotas antigas para preservar links existentes.

## 4. UI do SideMenu (grupos colapsáveis)

Em `src/components/DashboardLayout.tsx`:
- Trocar `qualidadeMenuItems: Item[]` por `MenuEntry = Item | Group`, onde `Group = { title, icon, children: (Item|Group)[], defaultOpen? }` (permite o subgrupo "Planejamento").
- Cabeçalho de grupo clicável com chevron; estado em `useState<Record<string, boolean>>` persistido em `localStorage` por papel.
- Auto-abrir o grupo cujo `children` contém `location.pathname`.
- Sublinks recuados (`pl-10`), sub-sublinks (`pl-14`), com a mesma marcação de ativo já existente.
- Sidebar colapsada: grupo vira ícone-pai com tooltip; clicar expande a sidebar e abre o grupo.
- Mobile (`Sheet`): mesmo padrão de grupos com chevron.
- **Somente o perfil `qualidade` recebe a hierarquia** — demais perfis seguem com array flat (sem regressão).

## 5. Arquivos afetados

Novos:
- `src/pages/quality/documents/Norms.tsx`, `Terms.tsx`, `MasterListPage.tsx` (wrappers leves; sem CRUD novo).
- `src/pages/quality/planning/Objectives.tsx`, `Indicators.tsx`, `Changes.tsx`.
- `src/pages/quality/competencies/Matrix.tsx`, `Program.tsx`, `Awareness.tsx` (wrappers das páginas existentes).

Editados:
- `src/components/DashboardLayout.tsx` — nova estrutura `qualidadeMenu` + render hierárquico.
- `src/App.tsx` — novas rotas; antigas mantidas como `Navigate`.
- `src/pages/quality/Documents.tsx` / `DocumentsHub.tsx` — remover Tabs do fluxo principal.
- `src/pages/quality/Planning.tsx` — fatiar em três páginas; remover Tabs da UI principal.
- `src/pages/quality/CompetenciesHub.tsx` — Tabs removidas do fluxo principal (mantidas só como compat para `?tab=`).

## 6. Critérios de aceite

- Menu da Qualidade com 9 itens de primeiro nível + Feed/Solicitações/Universidade.
- Cada sublink leva direto à tela, sem passar por tela com abas.
- Grupo da rota atual abre automaticamente; estado dos grupos persiste.
- Sidebar colapsada: clicar no ícone-pai expande e abre o grupo.
- Feed, Solicitações Corp e Universidade permanecem inalterados.
- Rotas antigas (`/quality/documents?tab=norms`, etc.) continuam funcionando via redirect.
- Lista Mestra é uma visão dos documentos existentes — sem nova tabela ou CRUD.
- Planejamento não tem mais Tabs na UI principal.
- Sublink "Matriz de Competências" (não "Treinamentos") em Competências e Pessoas.
- Build passa sem erros.

## 7. Fora de escopo

- Reorganizar menus de outros perfis.
- Mudar permissões/RLS.
- Mover Homologação para Configurações (adiado).
- Alterar abas internas de `VoiceOfCustomer`.
