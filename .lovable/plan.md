# Plano em execução — SGQ

**Etapa 0** ✅ Homologação dos 10 temas em `docs/sgq-homologacao-onda4.md`.

**Onda 4A + R1 + R3** ✅ entregues nesta iteração:

- **R1** — UI do `approval_scope` já existia em `CentralApproval.tsx` (cards de Master + Switches por tipo + fila de pendências).
- **R3** — schema com trigger bloqueando processo `active` sem documento publicado/válido, tabela `quality_process_document_history` com RLS + trigger de log, toggle `require_active_process_document` em Configurações → Parâmetros SGQ → Regras estruturais, aba "Histórico" no drawer de Processo + alerta visual quando documento vinculado está vencido/não publicado.
- **Norma** — colunas novas (`revision`, `status`, `responsible_user_id`, `superseded_by_id`, `attachment_url/name`, `review_frequency_months`, `last_reviewed_at`, `next_review_due_at`). Dialog estendido + tabela com badge de status e link de anexo.
- **Termo** — colunas novas (`version`, `status`, `responsible_user_id`, `review_frequency_months`, `last_reviewed_at`, `next_review_due_at`). Dialog estendido + badges de status/versão.
- **Parte Interessada** — coluna `treatment_status` (pendente/em_andamento/atendida/não_aplicável) com Select inline na listagem.
- **Melhorias** — schema com origem polimórfica (`origin_type`, `origin_id`) + eficácia (`effectiveness_status`, `effectiveness_verified_at/by`, `effectiveness_notes`). **UI de eficácia + botões "criar a partir de" ficam para iteração seguinte.**

## Iteração seguinte (extensão da própria Onda 4A)
- Botão "Criar melhoria a partir de" nas telas de NC, Auditoria, Desvio e Satisfação (pré-preenche `origin_type` + `origin_id`).
- UI de verificação de eficácia em melhorias manuais.
- Estender view `quality_improvements_v` para incluir eficácia das manuais.
- Painel "Revisões em atraso" no Dashboard (norma · termo · contexto · partes interessadas).

## Próximas ondas
- **Onda 4B** — submódulo Planejamento dentro de Riscos & Oportunidades (objetivos, indicadores, mudanças planejadas, ações consolidadas). Sem novo item de sidebar.
- **Refinos R2, R4, R5** — trilha/SLA/delegação do Master · Lista Mestre filtros/XLSX · Política diff + ciência por departamento.
- **Onda 5** — bloqueada até decisões de negócio (RH/Recursos, Documentos do colaborador, Calibração, Satisfação do Cliente, Saúde e Segurança).
