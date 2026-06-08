# Plano em execução — SGQ

**Etapa 0** ✅ Homologação dos 10 temas em `docs/sgq-homologacao-onda4.md`.

**Onda 4A + R1 + R3** ✅ entregues nas iterações anteriores (norma/termo com revisão+status, parte interessada com tratamento, melhorias com origem polimórfica e eficácia em schema, R1 UI approval_scope, R3 trigger documento ativo + histórico).

**Extensão Onda 4A** ✅ entregue nesta iteração:

- `quality_improvements_v` estendida com `effectiveness_status` (manual preenche, demais NULL).
- Componente compartilhado `CreateImprovementFromButton` com diálogo pré-preenchido (origem + id).
- Botão "Criar melhoria a partir de" disponível em: NCRs, Auditorias (em andamento/concluídas), Desvios e Reclamações/Sugestões (VoC).
- UI de **verificação de eficácia** na tela Melhorias: nova coluna "Eficácia" com badge clicável; diálogo permite registrar `eficaz` · `ineficaz` · `nao_aplicavel` · `pendente` com notas. Hook `verifyEffectiveness` salva `effectiveness_verified_at/by/notes/status`.
- View `quality_review_status_v` estendida para incluir **Norma · Termo · Parte Interessada · Risco** além de Documento e Contexto.
- Hook `useQualityReviewStatus` + painel **"Revisões em atraso"** no Dashboard com badges (atrasadas/próximas) e link por entidade.

## Próximas ondas
- **Onda 4B** — submódulo Planejamento dentro de Riscos & Oportunidades (objetivos, indicadores, mudanças planejadas, ações consolidadas). Sem novo item de sidebar.
- **Refinos R2, R4, R5** — trilha/SLA/delegação do Master · Lista Mestre filtros/XLSX · Política diff + ciência por departamento.
- **Onda 5** — bloqueada até decisões de negócio (RH/Recursos, Documentos do colaborador, Calibração, Satisfação do Cliente, Saúde e Segurança).
