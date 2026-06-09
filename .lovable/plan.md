## Correção da inconsistência apontada

A versão anterior do plano misturou duas hipóteses contraditórias. A **realidade verificada no código** é:

- **Cenário B é o correto**: as 3 telas existem **apenas como abas internas de hubs**, não como rotas próprias.
- Não há rotas `/quality/processes`, `/quality/org-context`, `/quality/org-chart` ou `/quality/scenario` registradas em `src/App.tsx` (busca em `App.tsx` retornou 0 ocorrências para esses identificadores).
- Acesso real confirmado nos arquivos lidos:
  - `RisksHub.tsx` (`/quality/risks-hub`) → abas `context` (OrgContext), `processes` (Processes), `scenario` (ScenarioSwot).
  - `CompetenciesHub.tsx` (`/quality/competencies-hub`) → aba `org` (OrgChart).
  - `SettingsHub.tsx` (`/quality/settings`) → aba `policy` (QualityPolicy).

O plano abaixo já parte dessa realidade única.

## Entregas

### 1. `sgq-mapa-de-telas_v4.pdf`

**Escopo varredura** (cobertura completa do escopo identificado no código — sem usar "100%"):
- `src/App.tsx` (todas as rotas e redirects)
- `src/pages/quality/*Hub.tsx` (abas internas dos 6 hubs: Dashboard, Documents, Risks, Competencies, Settings; e tabs do Dashboard se houver `?tab=`)
- Menu lateral / navegação principal (componente sidebar de Qualidade)
- Telas pessoais (`MySignature`, `MyAcknowledgements`, `MyCompetencies`, `profile`)
- Telas acessíveis apenas por botão/atalho fora do menu (ex: detalhes `/quality/satisfaction/:id`, `/quality/complaints/:id`, `/quality/management-review/:id`, `/quality/devices/:id`, `/quality/suppliers/:id`, `/quality/documents/:id`)

**Estrutura de cada linha do mapa** (colunas fixas, conforme sugerido):

| Grupo | Tela | Tipo de acesso | Acesso real | Arquivo | Função de negócio | Link direto no menu? |
|---|---|---|---|---|---|---|
| Estratégia e Gestão | Processos | Aba interna | `/quality/risks-hub?tab=processes` | `RisksHub.tsx` + `Processes.tsx` | Visualização de processos, responsáveis e matriz | Não (via hub Riscos) |
| Estratégia e Gestão | SWOT / Cenário | Aba interna | `/quality/risks-hub?tab=scenario` | `ScenarioSwot.tsx` | Cálculo automático do cenário estratégico a partir do SWOT | Não |
| Estratégia e Gestão | Contexto Organizacional | Aba interna | `/quality/risks-hub?tab=context` | `OrgContext.tsx` | Cadastro de contexto interno/externo e itens SWOT | Não |
| Liderança | Organograma | Aba interna | `/quality/competencies-hub?tab=org` | `OrgChart.tsx` | Estrutura, responsabilidades e autoridades | Não |
| Configurações | Política da Qualidade | Aba interna | `/quality/settings?tab=policy` | `QualityPolicy.tsx` | Edição e versionamento da política interna | Não |
| … | (demais rotas/abas) | … | … | … | … | … |

- **Hooks** ficam em **anexo técnico no final** (não na tabela executiva) — quem só quer entender funcionalmente lê as 6 colunas acima.
- PDF executivo: rota/acesso, arquivo, função, observações. Anexo técnico: hooks principais por tela.

### 2. `relatorio_comparativo_sgq_arrow_v2.pdf`

**Regras de reclassificação** (refinadas para evitar viés):
- **Critério de aceite**: "0 item marcado como 'Não identificado' indevidamente". Itens permanecem como "Não identificado" quando realmente não houver evidência funcional no código.
- **Reclassificações confirmadas** (eram "Não identificado", viram "Atendido" porque há evidência funcional acessível):
  - Processos → Atendido (aba `processes` do RisksHub).
  - SWOT / Contexto → Atendido (abas `context` + `scenario` do RisksHub).
  - Liderança / Organograma → Atendido (aba `org` do CompetenciesHub, com `useQualityOrgChart`).
- **Política da Qualidade — manter como "Atendido parcialmente"**, não promover para "Atendido". Justificativa: `QualityPolicy.tsx` e `PolicyAwarenessBanner` cobrem o uso **interno** (gestão, edição, ciência do colaborador), mas o requisito original exige **publicação externa no site institucional para clientes/público**. Sem evidência de página pública/externa, fica parcial.
- **Telas extras não pedidas** (ITBackup, CentralApproval, IsoStructure, TrainingProgram, LayoutGlobal, Communication, Knowledge, Homologation, Suppliers, Devices, ControlledCopies etc.) **não alteram** o status de itens do documento original. Vão para uma seção dedicada **"Entregas adicionais identificadas no app"**, sem inflar a aderência.
- Mantém honestos os itens que continuam parciais por falta de evidência (ex.: regras de impressão/download por perfil em GED, expiração automática de anexos normativos, etc.).

**Seções do relatório v2**:
1. Sumário executivo (placar novo).
2. Correções em relação ao v1 (com motivo de cada mudança, citando aba/arquivo).
3. Item-a-item com status (Atendido / Atendido parcialmente / Não identificado) e evidência.
4. Entregas adicionais identificadas no app.
5. Lacunas reais remanescentes.

## Execução técnica

- Scripts Python em `/tmp` usando `reportlab` (reutilizando `gen_screen_map.py` e `gen_comparative_report.py` existentes, com ajustes).
- A4 portrait, margem 36pt, `colWidths` controlado para não estourar largura (problema já corrigido antes).
- Identidade visual: azul `#1d4ed8`, cabeçalho/rodapé fixos.
- **QA obrigatório**: `pdftoppm` em todas as páginas dos dois PDFs antes de entregar.
- Saída: `/mnt/documents/sgq-mapa-de-telas_v4.pdf` e `/mnt/documents/relatorio_comparativo_sgq_arrow_v2.pdf`, entregues via `<presentation-artifact>`.
- **Nenhuma alteração no código do app** — somente artefatos.

## Aceite

- Mapa v4: todas as rotas de `App.tsx` + todas as abas dos 5 hubs documentadas com as 6 colunas acima; hooks em anexo.
- Relatório v2: nenhum item "Não identificado" indevidamente; Política da Qualidade permanece parcial; telas extras isoladas em seção própria.
- Dois PDFs abrem limpos em A4 portrait, sem cortes de tabela.