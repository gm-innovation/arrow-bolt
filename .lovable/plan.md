
# Plano de correções — SGQ (rodada v2 do PDF)

Ordem executada de acordo com as suas respostas. Só depois desta rodada seguimos para §7+ da ISO / Análise Crítica.

## 1. Classificação com opção Controlada/Não controlada (item 4)

- No `NewDocumentDialog.tsx` transformar o campo **Classificação** em Select com as opções: **Controlada** e **Não controlada** (removendo o campo "Cópia" separado que criei antes).
- No `EditDocumentMetadataDialog.tsx` aplicar o mesmo Select.
- Mapear internamente: `classification = "Controlada" → control_mode = "controlled"` e `"Não controlada" → "uncontrolled"`, mantendo compatibilidade com marca d'água do `PDFCanvasViewer`.
- Migração leve para normalizar registros existentes (`classification` livre → mapear pelos casos já presentes; deixar como "Controlada" por padrão quando indefinido).

## 2. Data da próxima revisão editável ao subir nova versão (item 5)

- Em `DocumentDetail.tsx`, no fluxo "Salvar como nova versão" adicionar input `type="date"` **Próxima revisão** ao lado dos campos de nova versão.
- Passar o valor para `useQualityDocuments.uploadNewVersion` (novo parâmetro opcional `next_review_date`). Se preenchido, sobrescreve o cálculo automático; se vazio, mantém a auto‑renovação atual (settings `document_review_months`).

## 3. Upload de arquivo nas Referências Normativas (item 8)

- Ampliar `NormFormDialog.tsx` com bloco de upload (input file) — reaproveitando o bucket `quality-documents` em pasta `norms/{company_id}/{norm_id}/`.
- Adicionar coluna `file_url` (+ `file_name`, `file_size`) na tabela `quality_reference_norms` via migration.
- `NormsTab.tsx`: coluna "Arquivo" com ícone de download.
- Aceitar PDF, Word, Excel (mesmo padrão do GED).

## 4. Erro na fila de aprovação (item 9)

Investigação em build mode:
1. Abrir `/quality/central-approval` via Playwright autenticado, capturar console + network para identificar se o erro é (a) leitura da fila (RLS na `quality_central_approvals`), (b) `decide.mutate` (update), ou (c) inserção de evento (`quality_central_approval_events`).
2. Testar também o **envio para a fila** a partir de um documento (`request.mutate` no `useCentralApproval`) — hipótese principal do usuário: documento não chega à fila.
3. Corrigir conforme o diagnóstico: RLS/GRANT nas tabelas, política de INSERT para `qualidade`/`director`, ou trigger que popula `company_id`.

Sem essa investigação empírica não posso definir a correção exata — o passo será feito antes de qualquer outro item aqui.

## 5. Contexto da Organização — subpáginas (item 10)

Criar aba/menu "Contexto da Organização" reorganizado com as páginas gerenciáveis mostradas no print:

- Análise Competitiva do Negócio (novo — matriz simples de concorrentes/posicionamento)
- Análises Críticas (já existe — apontar para `/quality/management-review`)
- Escopo do Sistema de Gestão (já existe no `OrgContext` — extrair em página própria)
- Gestão das Partes Interessadas (já existe em `/quality/interested-parties` — linkar)
- Identidade Organizacional: Missão, Visão e Valores (novo — CRUD simples com histórico/versionamento)
- Objetivos Estratégicos (novo — CRUD ligável a objetivos de qualidade existentes)
- Política da Qualidade (já existe em `/quality/policy` — linkar)

Implementação:
- Nova página hub `/quality/org-context` (renomeando a existente para `/quality/org-context/questions` se necessário) com card‑navegação para cada subpágina.
- Tabelas novas: `quality_org_identity` (missão/visão/valores + versão) e `quality_strategic_objectives` (título, descrição, indicador, meta, prazo, responsável). Ambas com RLS + GRANTs padrão.
- `quality_competitive_analysis` (concorrente, pontos fortes, pontos fracos, diferenciação, oportunidades).

## 6. SWOT por setor (item 11)

- No `OrgContext.tsx` aba SWOT, além do filtro atual, adicionar visualização em **abas por departamento** (ou lista expansível) com uma matriz 2×2 separada para cada setor cadastrado.
- Botão "Duplicar SWOT para outro setor" para acelerar o cadastro.

## 7. Painel com visualização de cada processo (item 12)

- Criar página `/quality/processes/:id/panel` (ou tab "Painel" dentro do detalhe do processo) exibindo: dados do processo, documento(s) vinculado(s), indicadores/KPIs, partes interessadas ligadas, riscos/oportunidades associados, últimas revisões.
- No painel geral `/quality/processes`, botão "Painel" em cada linha.

## 8. Vincular vários documentos ao processo (item 13)

- Nova tabela `quality_process_documents` (`process_id`, `document_id`, `is_primary`, `linked_at`, `linked_by`), com RLS + GRANTs.
- Migração: portar `current_document_id` existente para a nova tabela como `is_primary = true`.
- UI em `Processes.tsx` / detalhe do processo: multi‑select de documentos, marcar 1 como principal.
- Ajustar cálculo de "processo com documento válido" para considerar o principal.
- Corrige também o "erro de documento vinculado no processo comercial" mostrado no PDF.

## 9. Autorização do perfil master (item 1)

- No hook `useDocumentPerms` (e nas telas de documento) permitir edição/exclusão para `isMaster` (do `useQualitySettings`) mesmo que a RLS geral bloqueie.
- Ajustar policies de `quality_documents` (UPDATE/DELETE) para permitir quando `user_id = quality_master_user_id` da empresa (via função SECURITY DEFINER `is_quality_master(uid)`).
- Aplicar a mesma lógica em `quality_documents_versions`, `quality_reference_norms`, `quality_processes`, `quality_org_context_items`.

---

## Sequência de entrega

1. Investigar fila de aprovação (item 4). Corrigir.
2. Itens do GED: 1 (Classificação), 2 (data nova versão), 3 (upload em normas), 9 (autorização master).
3. Contexto da organização: 5 (subpáginas), 6 (SWOT por setor).
4. Processos: 7 (painel do processo), 8 (multi‑documentos).
5. Depois de tudo validado, retomamos §7+ / Análise Crítica.

## Detalhes técnicos (leitura opcional)

- Migrations criadas: `quality_reference_norms.file_url`, `quality_org_identity`, `quality_strategic_objectives`, `quality_competitive_analysis`, `quality_process_documents`, função `is_quality_master(uuid)`.
- Cada tabela nova terá `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` + `GRANT ALL ... TO service_role` e políticas RLS por `company_id` + role qualidade/master.
- Nenhum item exige mudanças de secrets ou novos conectores; a rodada é 100% frontend + banco.

Confirma este plano? Assim que aprovar, começo pelo diagnóstico da fila de aprovação (item 4).
