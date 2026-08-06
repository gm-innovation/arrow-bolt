# De onde vieram as atividades de Inmarsat na "OS 4539"

## O que a investigação mostrou

As atividades apontadas (reinstalação da antena Inmarsat-C, confecção de conector TNC para cabo RGC-213, PV teste, testes de e-mail e de SSAS) **não foram inventadas pela IA**. Elas vêm de um relatório real do Auvo:

- Atendimento Auvo **69566199** — técnico **Alexsandro Calheiros**, data **06/02/2026**, embarcação SKANDI IPANEMA, 9 fotos.
- O texto desse relatório descreve exatamente: reparo da antena Inmarsat-C em laboratório, reinstalação no topo do mastro, confecção de novo conector, PV teste no passadiço, testes de e-mail e SSAS; material fornecido: conector TNC RGC-213, base de antena, abraçadeiras.

O problema é de **agrupamento**: esse atendimento foi lançado no Auvo com o número externo **4539**, o mesmo número dos 13 outros atendimentos do serviço de CFTV/DGPS do Skandi Ipanema (Romulo, Cristiano, Carlos Augusto, Alexandre Starck). Todos caíram no mesmo grupo de serviço, então a tela mostra um serviço "OS 4539 — Manutenção no Sistema CFTV" contendo atividades de um atendimento de rádio/Inmarsat que é outro escopo.

Ou seja: erro humano de numeração no Auvo, e a auditoria hoje não deixa visível de qual relatório cada pendência veio.

## O que fazer

1. **Mostrar a origem de cada pendência de foto**
   - Em cada cartão de atividade no modal de revisão, exibir o atendimento de origem: nº do atendimento Auvo, técnico e data.
   - Trecho/link para abrir o relatório correspondente na aba de relatórios do serviço, para conferência imediata.

2. **Alertar quando o grupo mistura escopos diferentes**
   - Faixa de aviso no topo do modal e na linha do serviço quando os atendimentos do mesmo número de OS tiverem técnicos/datas/equipamentos claramente distintos.
   - Texto explicando que o número da OS pode ter sido reaproveitado no Auvo e indicando quais atendimentos divergem.

3. **Permitir desvincular um atendimento do grupo**
   - Ação "Este atendimento não pertence a esta OS" no relatório/atendimento, que o remove do grupo e o joga para a aba "Sem Serviço", onde já existe o vínculo manual.
   - As pendências de material e de foto daquele atendimento acompanham a mudança de grupo.

4. **Agrupar as pendências de foto por atendimento** dentro do modal, em vez de uma lista única, para que fique claro que cada bloco corresponde a um relatório.

## Notas técnicas

- `auvo_photo_findings` já guarda `auvo_task_uid` e `report_id`; basta cruzar com `auvo_tasks` (nº, técnico, data) no hook `useAuvoIntegration.ts` e passar essa informação ao `AuvoGroupReviewDialog.tsx`.
- A heterogeneidade do grupo é detectada no frontend a partir dos atendimentos já carregados (conjunto de técnicos, intervalo de datas, equipamento citado no relatório) — sem nova chamada de IA.
- Desvincular = limpar `service_group_id` do atendimento (e propagar aos registros de divergência), reaproveitando a lógica já existente da aba "Sem Serviço". Nenhuma nova tabela; políticas de acesso atuais já cobrem coordenador e diretoria.

## Arquivos previstos

- `src/hooks/useAuvoIntegration.ts` — origem das pendências e ação de desvincular atendimento.
- `src/components/admin/auvo/AuvoGroupReviewDialog.tsx` — origem por atendimento, agrupamento e faixa de aviso.
- `src/components/admin/auvo/AuvoServiceReportTabs.tsx` — ação de desvincular no relatório.
- `src/pages/admin/AuvoAudit.tsx` — indicador de grupo com escopos divergentes.
