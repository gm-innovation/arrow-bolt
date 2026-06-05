
# Portal ISO no Arrow — Evolução da Área de Qualidade Existente

> **Correção conceitual aplicada:** este plano **não cria** uma nova área de Qualidade. A área já existe no Arrow (rota `/quality/*`, role `qualidade`, páginas `Dashboard / NCRs / ActionPlans / Audits / Reports / Settings`, hooks `useQualityNCRs / useQualityActionPlans / useQualityAudits`, tabelas `quality_audits / quality_audit_findings / quality_ncrs / quality_action_plans / quality_action_items / quality_ncr_attachments / quality_audit_checklist_items`). O trabalho é de **expansão e adaptação** dessa estrutura para absorver as capacidades exigidas pela ISO 9001 e pela operação real da responsável.

---

## 1. Entendimento revisado do escopo

Estamos internalizando, **dentro da área de Qualidade já existente no Arrow**, a gestão hoje feita em Portal ISO + Word + planilhas. Os documentos enviados servem como base, e há também requisitos confirmados diretamente pela responsável da área.

Premissas:
- A área de Qualidade do Arrow **já existe** e continuará sendo a casa de tudo isto.
- O objetivo é evoluir essa área existente, **não criar um módulo paralelo**.
- A área tem hoje 1 usuário responsável — esse usuário é o **master** e concentra edição, revisão, aprovação, publicação, versões e gestão de conteúdo.
- **Aprovação é simples** (apenas o Master), mas a estrutura deve permitir futura expansão para aprovação múltipla **sem refatoração estrutural**.
- A área convive com outros módulos do Arrow (RH, Universidade Corporativa, OS, Compras) e **consome** o que já existe, sem duplicar.
- O objetivo é uma área operacional aderente à ISO 9001 — **não um repositório de arquivos**.

---

## 2. Requisitos confirmados (vindos dos documentos)

### 2.1 GED — Controle Documental
- Documentos versionados com fluxo rascunho → aprovação (Master) → publicação → obsolescência
- Metadados: código, título, revisão, data de emissão, data da última revisão, próxima revisão/expiração, classificação, elaborado por, aprovado por, referência normativa
- Histórico de alterações por documento
- Lista mestra
- Cópia controlada vs não controlada (comportamento distinto)
- Permissão granular: visualizar / imprimir / baixar
- Log de impressão e download (data + usuário)
- Notificação ao responsável quando nova versão é aprovada
- Geração de PDF no **layout-padrão do Rascunho** (capa, controle, sumário, corpo, histórico, rodapé)
- Editor **híbrido**: rich-text interno + upload Word/PDF
- **Cópia impressa controlada** com registro: quem recebeu, quando, qual documento, qual revisão, recolhimento/inutilização — **entra na Fase 1**

### 2.2 Estrutura ISO (módulos previstos nos documentos)
- Escopo do SGQ, Referência Normativa, Termos e Definições
- Contexto da Organização, Processos mapeados, documentos por processo
- Cliente: documentos exigidos por clientes (CNPJ, Alvará, IE...) com expiração
- Pessoas: cargos, competências, requisitos de treinamento por função
- Infraestrutura: cadastro de instrumentos + certificados de aferição
- NC: causa, ação corretiva, efeito esperado, responsável, prazo, **verificação de eficácia**, evidência
- Auditoria interna periódica (mensal por processo)
- Análise Crítica pela Direção (ata → PDF)
- Melhoria (consolidação única)

---

## 3. Requisitos adicionais confirmados pela responsável (fora dos documentos)

| # | Requisito | Detalhes |
|---|---|---|
| A1 | **Acesso restrito ao master** | Apenas 1 usuário tem acesso à área. Sem múltiplos perfis internos por ora. |
| A2 | **Assinatura eletrônica interna** | Cada colaborador tem assinatura salva no storage; botão explícito para inserir; vinculada ao **documento + versão + ação** (aprovação, ciência, etc.); trilha de auditoria; **sem ICP-Brasil obrigatório**. |
| A3 | **Distinção de tipos de treinamento** | Internos / obrigatórios / externos exigidos por ISO ou órgãos. Nem todo obrigatório é fornecido pela Universidade Corporativa. |
| A4 | **Qualidade só consulta treinamentos** | Qualidade não é dona desse módulo; consulta requisitos por função e competências; **não duplica** a Universidade Corporativa nem o RH. |
| A5 | **Canal de Compliance** | Solicitações, reclamações, denúncias; envio **anônimo**; **abertura sem login preferencialmente** (canal público) com opção de anonimato real; protocolo, sigilo, anexos, fluxo de tratamento interno; separado do GED. |
| A6 | **Visibilidade ampliada controlada** | Alguns documentos (ex.: Política da Qualidade) podem ser visíveis fora da área, sem quebrar a premissa de área fechada. |
| A7 | **Saúde e Segurança + Conscientização** | Citados como temas da estrutura ISO. |
| A8 | **Aprovação simples, com estrutura extensível** | Apenas o Master aprova; modelagem deve permitir múltiplos aprovadores futuro sem refatoração. |
| A9 | **Cópia impressa na Fase 1** | Confirmado como dor latente — entra junto com o GED. |

---

## 4. Hipóteses e sugestões (NÃO são requisitos)

Propostas técnicas/arquiteturais para discussão:
- Tabelas sugeridas (Fase 1): `quality_documents`, `quality_document_versions`, `quality_document_permissions`, `quality_document_access_log`, `quality_document_types`, `quality_signatures`, `quality_controlled_copies`
- Tabelas sugeridas (Compliance): `quality_compliance_reports`, `quality_compliance_attachments`, `quality_compliance_status_log`
- Editor: Tiptap. PDF: `@react-pdf/renderer` (já usado em certificados). Storage: buckets privados `quality-documents` e `quality-signatures`.
- Marca d'água "CÓPIA NÃO CONTROLADA" no PDF gerado quando o destinatário não tem permissão de cópia controlada.
- Protocolo do canal de compliance: `COMP-AAAA-NNNN`.

Itens marcados como **sugestão a validar** (não tratar como requisito):
- BSC, Análise Competitiva formalizada, SIPOC, cruzamento SWOT automático, assinatura ICP-Brasil.

---

## 5. Roadmap revisado (evolução, não criação)

Em cada fase: **Reaproveitar / Adaptar / Criar do zero**.

### Fase 1 — GED, Assinatura e Cópia Controlada (dentro da Qualidade existente)

**Reaproveitar**
- Rota `/quality/*` e shell protegida por `ProtectedRoute` com role `qualidade`
- `src/pages/quality/Dashboard.tsx`, `Reports.tsx`, `Settings.tsx`
- Padrão dos hooks `useQualityNCRs / useQualityAudits / useQualityActionPlans` como template
- `PDFCanvasViewer` para preview embarcado
- `@react-pdf/renderer` para o layout-padrão
- Padrão de upload privado de `useCorpDocuments` como referência

**Adaptar**
- `Dashboard.tsx`: cards de "Documentos a expirar", "Aguardando aprovação", "Cópias controladas pendentes de recolhimento" ao lado dos atuais
- `Settings.tsx`: substituir placeholder por configuração real (tipos de documento, prefixos de código, classificações)
- Menu lateral (`DashboardLayout` quando `userType=qualidade`): entradas "Documentos", "Lista Mestra", "Cópias Controladas", "Minha Assinatura"

**Criar do zero**
- Nova rota `/quality/documents` + páginas `DocumentList`, `DocumentEditor` (rich-text + upload), `DocumentDetail` (versões + permissões + cópias + log)
- Tabelas e RLS do GED (lista da seção 4)
- Fluxo de aprovação simples, com estrutura extensível para múltiplos aprovadores futuro
- Assinatura eletrônica: componente reaproveitável, sempre vinculado ao triplo **documento + versão + ação**
- Geração de PDF no layout-padrão do Rascunho
- Registro de cópia impressa controlada (entrega, recolhimento, inutilização)

### Fase 2 — Estrutura ISO / Processos / Base de Gestão (dentro da Qualidade existente)

**Reaproveitar**
- Mesma área `/quality/*`, mesmo menu
- Tabelas `clients` / `client_legal_entities` para Documentos do Cliente
- Padrão de PDF do GED (Fase 1) para Atas e Política

**Adaptar**
- Dashboard ganha bloco "SGQ — Contexto" (escopo vigente, próxima análise crítica, indicadores básicos)
- Settings ganha aba "Estrutura SGQ" (escopo, normas de referência)

**Criar do zero**
- Tabelas/telas: Escopo do SGQ, Referência Normativa, Termos e Definições, Contexto da Organização, Processos (estrutura básica — SIPOC fica como **sugestão a validar**), Documentos do Cliente com expiração, Análise Crítica pela Direção, Melhoria consolidada, Saúde e Segurança + Conscientização
- Mecanismo de **visibilidade ampliada controlada** (flag por documento + leitura cruzada fora da área)

### Fase 3 — Pessoas / Requisitos por Função / Integrações

**Reaproveitar**
- Universidade Corporativa (RH) — apenas leitura: cursos, conclusões, certificados
- `useUniversity`, `useUniversityCompletion`, telas existentes
- Cadastro de cargos/competências do RH

**Adaptar**
- Nova tela `/quality/competencies` que **lê** dados do RH e da Universidade; nenhuma duplicação
- Dashboard ganha bloco "Conformidade de Competências por Função"

**Criar do zero**
- Tabela de **requisitos por função** (interno / obrigatório / externo ISO ou órgão)
- Vínculo "requisito ↔ curso da Universidade" ou "requisito ↔ certificação externa"
- Painel de rastreabilidade (quem cumpre, quem está vencido)

### Fase 4 — Qualidade Operacional (aprimorar o que já existe)

**Reaproveitar**
- `quality_ncrs`, `quality_ncr_attachments`, `quality_audits`, `quality_audit_findings`, `quality_audit_checklist_items`, `quality_action_plans`, `quality_action_items`
- Páginas `NCRs.tsx`, `Audits.tsx`, `ActionPlans.tsx`
- Hooks `useQualityNCRs`, `useQualityAudits`, `useQualityActionPlans`
- Diálogos `NewNCRDialog`, `NewAuditDialog`, `NewActionPlanDialog`

**Adaptar**
- RNC: campos de causa, efeito esperado, **verificação de eficácia**, evidência
- Plano de Ação: registro formal de eficácia + link com RNC
- Auditoria: gerador de calendário recorrente mensal por processo
- Anexar **assinatura eletrônica** (Fase 1) nos registros encerrados de RNC e Auditoria
- Layout-padrão do GED **apenas** em documentos formais; RNC/Auditoria/Plano mantêm formato funcional próprio

**Criar do zero**
- "Desvios" — esclarecer se é entidade nova ou subtipo de RNC (Risco R1)
- Cadastro de Instrumentos + Certificados de Aferição

### Fase 5 — Canal de Compliance

**Reaproveitar**
- Mesma área `/quality/*` (item de menu separado)
- Padrão de upload de anexos privados
- Sistema de notificações para alertar o master

**Adaptar**
- Dashboard ganha card "Protocolos de Compliance abertos" (apenas contagem, sem expor conteúdo)

**Criar do zero**
- Tela de abertura de protocolo **sem necessidade de login** (canal público), com identidade oculta se autenticado
- Tabelas `quality_compliance_reports`, `quality_compliance_attachments`, `quality_compliance_status_log`
- Fluxo: recebida → em análise → resposta → encerrada
- Confidencialidade rigorosa + trilha de acesso

> Pode subir antes da Fase 4 se a responsável priorizar.

---

## 6. O que entra obrigatoriamente na Fase 1

Todos dentro da área `/quality/*` já existente:

1. Adaptação do `QualityDashboard` com blocos de GED
2. Adaptação do `QualitySettings` com configuração real
3. Nova rota `/quality/documents` + lista, editor (rich-text + upload), detalhe
4. Fluxo rascunho → aprovação (Master) → publicação → obsoleto, com histórico; **estrutura extensível para múltiplos aprovadores**
5. Metadados completos do "Controle do Documento"
6. Lista mestra
7. Expiração / próxima revisão com alerta
8. Cópia controlada vs não controlada (marca d'água quando aplicável)
9. Permissões granulares: visualizar / imprimir / baixar
10. Log de impressão e download
11. Notificação de nova versão aprovada
12. PDF no layout-padrão do Rascunho
13. **Assinatura eletrônica interna** (cadastro + ação de assinar + auditoria), sempre vinculada ao triplo **documento + versão + ação** — componente reutilizável
14. **Cópia impressa controlada** (entrega/recolhimento/inutilização) — incluso na Fase 1
15. Viewer integrado (`PDFCanvasViewer`)

---

## 7. Riscos remanescentes (validar antes ou durante a Fase 2)

| # | Risco | A validar |
|---|---|---|
| R1 | "Desvio" vs "Não Conformidade" | Entidade separada ou subtipo de RNC? |
| R2 | Visibilidade ampliada | Por documento, por classificação ("Pública"), ou flag manual do master? Quem vê? |
| R3 | Saúde e Segurança + Conscientização | Módulo próprio, documentos do GED ou integração com RH? |
| R5 | Marca d'água em cópia não controlada | Texto no rodapé ou marca d'água diagonal de fundo? |
| R6 | Estrutura do Contexto da Organização | Quais subseções (BSC, SWOT, Análise Competitiva, SIPOC) entram de fato na Fase 2? |
| R7 | Canal de Compliance — anonimato real | Sem IP/usuário nunca, ou cifrado e acessível só sob processo formal? |
| R8 | Integração com Universidade Corporativa | Quais dados a Qualidade consome? Read-only via hooks ou view dedicada? |
| R9 | Certificações externas (NRs, ISO pessoais) | Onde ficam — `technician_documents`, `hr_partnerships` ou tabela nova gerida pelo RH? |

R5 é o único risco da Fase 1 — pode ser resolvido durante a implementação com uma proposta visual para você aprovar.

---

## 8. Próximo passo

Aprovar este plano. Em seguida detalho o **plano técnico exclusivo da Fase 1** (schema completo, RLS, telas, componentes, fluxos, layout do PDF) para nova aprovação antes de qualquer implementação.
