# Roteiro de Homologação — Módulo Qualidade (ISO 9001)

> Documento de referência para a homologação formal do Sistema de Gestão da Qualidade (SGQ).
> A execução deve ser feita pela Coordenação da Qualidade utilizando **dados reais** do ambiente.
> Cada caso de teste deve ser registrado como **OK / NOK / Observação**.
> O resultado final é registrado em `/quality/homologation`, com upload do PDF assinado.

---

## Ciclo de homologação

- **Ciclo:** _ex.: 2026_
- **Responsável:** Coordenação da Qualidade
- **Aprovador:** Diretoria
- **Escopo:** Módulos entregues nas sprints P0–P3 (Planejamento, Consolidação de Melhorias, Partes Interessadas, Rastreabilidade, Plano Anual).

---

## A. Planejamento (ISO 9001 §6.2 / §6.3)

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| A1   | Vincular objetivo a riscos e partes interessadas | Em **Qualidade → Planejamento → Objetivos**, criar/abrir objetivo. Selecionar 1+ riscos e 1+ partes nos multi-selects. | Vínculos persistem nas tabelas `quality_objective_risks` e `quality_objective_parties` e aparecem no painel **Rastreabilidade**. |   |   |
| A2   | Farol do indicador (verde/amarelo/vermelho) | Registrar medição de um indicador. | Badge na lista **Indicadores** muda conforme regra (≥ meta = verde; 80–99% = amarelo; < 80% ou sem medição = vermelho). |   |   |
| A3   | Avaliação de eficácia de mudança planejada | Marcar uma mudança como **implementada** e abrir **“Avaliar Eficácia”**. | `effectiveness_status` atualiza (eficaz/parcial/não_eficaz); registro fica visível no painel da mudança. |   |   |
| A4   | Plano Anual da Qualidade (PDF) | Header de **Planejamento → Plano Anual (PDF)**. | PDF é gerado com Capa, Objetivos, Indicadores e Mudanças Planejadas com data e eficácia. |   |   |

---

## B. Consolidação de Melhorias (ISO 9001 §10)

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| B1   | Trigger Fornecedor → Melhoria | Registrar incidente em **Provedores Externos**. | Aparece automaticamente em **Não-Conformidades → Melhorias** (origem `supplier_incident`). |   |   |
| B2   | Trigger Calibração reprovada → Melhoria | Registrar calibração com resultado **reprovada**. | Aparece automaticamente em Melhorias (origem `device_failure`). |   |   |
| B3   | Retro-vínculo NCR/Auditoria → Plano de Ação | Gerar plano de ação a partir de uma NCR e de um achado de auditoria. | `action_plan_id` é gravado nas respectivas tabelas; coluna **Eficácia** em Melhorias deixa de ser “—”. |   |   |
| B4   | Contadores de alertas | Forçar uma melhoria com eficácia vencida e um artigo de conhecimento vencido. | Sino/banner exibe os contadores `improvement_effectiveness` e `knowledge_review`. |   |   |

---

## C. Partes Interessadas (ISO 9001 §4.2 / §7.2)

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| C1   | Histórico de tratativas | Abrir parte interessada e mudar o `treatment_status`. | Nova linha aparece em **Histórico de Tratativas** (`quality_party_treatments`). |   |   |
| C2   | Evidência vencida | Cadastrar evidência com `valid_until` no passado. | Alerta `party_evidence` é emitido e KPI no `ClosureKpiStrip` reflete o vencimento. |   |   |
| C3   | KPIs do Dashboard | Acessar **Qualidade → Dashboard**. | Os 3 KPIs aparecem: evidência vencida, eficácia pendente, partes a revisar. |   |   |

---

## D. Dashboard & Alertas

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| D1   | Coerência dos KPIs | Comparar valores do `ClosureKpiStrip` com as listas-fonte. | Números batem. |   |   |
| D2   | Navegação via KPI | Clicar em cada KPI. | Leva à tela correta com filtro aplicado. |   |   |
| D3   | Centro de alertas | Abrir o sino de notificações. | Novas categorias de alerta aparecem corretamente. |   |   |

---

## E. Rastreabilidade reversa

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| E1   | Risco → Objetivos | Abrir um risco que esteja vinculado a objetivos. | Seção “Objetivos vinculados” lista os objetivos. |   |   |
| E2   | Parte → Objetivos | Abrir uma parte interessada vinculada. | Seção “Objetivos vinculados” lista os objetivos. |   |   |
| E3   | Painel de rastreabilidade | Abrir um objetivo. | `ObjectiveTraceabilityPanel` mostra riscos e partes vinculados. |   |   |

---

## F. Segurança e RLS

| Caso | Cenário | Passos | Resultado esperado | OK/NOK | Observação |
|------|---------|--------|--------------------|--------|------------|
| F1   | Acesso negado a não-Qualidade | Logar como técnico/comercial e tentar abrir `/quality/*`. | Acesso bloqueado pela RLS / rota. |   |   |
| F2   | Coordenador da Qualidade | Logar como coordenador. | CRUD completo nos módulos esperados. |   |   |
| F3   | Diretor | Logar como diretor. | Visão total + assinatura/aprovação de homologação. |   |   |

---

## Conclusão

- [ ] Todos os casos OK → **Homologado**.
- [ ] Casos NOK não-bloqueantes → **Homologado com ressalvas** (listar ressalvas no campo Observações da homologação).
- [ ] Casos NOK bloqueantes → **Reprovado** (descrever no campo Observações e abrir tratativa).

Após a conclusão, exportar este roteiro preenchido em PDF, coletar assinaturas (Coordenação da Qualidade + Diretoria) e fazer upload em **Qualidade → Homologação → Nova homologação**.
