# Plano em execução — SGQ

**Etapa 0** ✅ Homologação dos 10 temas em `docs/sgq-homologacao-onda4.md`.

**Ondas 4A + Extensão 4A + R1/R3 + R2/R4/R5 + 4B** ✅ entregues.

## Onda 5 — Consolidação (entregue)

Escopo definido em homologação (sem novas tabelas, sem subduplicação):

- **§7.1.2 Pessoas / Competências — Camada SGQ leve sobre RH:**
  - Novo componente `RhBridgeSummary` agrega `quality_competency_matrix_v` por cargo (proxy de departamento) com conformidade %, gaps e cobertura de colaboradores.
  - Embutido no topo da aba **Matriz** em `/quality/competencies?tab=matrix`.
  - Sem novas tabelas. Reaproveita competências, mapeamentos e Universidade existentes.

- **§7.1.5 Calibração:**
  - Página dedicada já existente em `/quality/devices` (inventário, calibrações, certificados, checkpoints, status overdue automático via `quality_device_status_refresh`).
  - Alias `/quality/calibration` → `/quality/devices` adicionado para padronização semântica.
  - Dashboard de vencimentos já presente (cards "Calibrações vencidas" / "Fora de serviço").

- **§9.1.2 Satisfação do Cliente:**
  - `VoiceOfCustomer.tsx` já consolida NPS/CSAT médios, taxa de resposta e reclamações abertas, integrado com `quality_satisfaction_responses` e `quality_complaints`.
  - Sem novas campanhas/disparos — adiado conforme decisão.

- **Saúde & Segurança / Documentos do Colaborador:**
  - Submódulo `/quality/safety` já existente com prefixos PCMSO/PGR/LTCAT/NR01/FICHA_EPI/ASO/LAUDO_SST e badges de vencimento.
  - Alertas consolidados em `useQualityAlerts` (`safety`) e cards do Dashboard.

## Pós-Onda 5 (opcional, depende de decisão)

- Campanhas automáticas de satisfação (e-mail/WhatsApp pós-OS).
- Verificações intermediárias de calibração + abertura automática de NCR em desvio.
- Submódulo próprio de competências/treinamentos no SGQ (descartado em homologação; manter Universidade como fonte).
