# Ver o relatório do técnico durante a revisão da divergência

Hoje, ao clicar em "Revisar" na tela de Auditoria Auvo × Estoque, o coordenador vê apenas o nome do material, a nota da IA e o trecho curto citado. Para decidir se a divergência é real, ele precisa abrir o Auvo. A revisão passa a mostrar o relatório completo do atendimento dentro do próprio diálogo.

## O que muda

No diálogo "Revisar divergência", acima do campo de conclusão:

- **Resumo do atendimento**: OS, cliente, técnico, data, check-in/check-out.
- **Relatório do técnico**: texto completo do relatório, em área com rolagem.
- **Materiais citados no relatório**: lista com nome mencionado, quantidade, unidade e o trecho de origem — para comparar direto com a baixa de estoque.
- **Questionário do Auvo**: pares pergunta/resposta, quando existirem.
- **Fotos e anexos**: miniaturas clicáveis que abrem a imagem original em nova aba.
- **Comparativo da divergência**: quantidade baixada no estoque × quantidade relatada, com a classificação e o valor em risco em destaque.

Estados tratados:
- Atendimento sem relatório importado ainda: aviso "Relatório não disponível no Auvo" com sugestão de usar "Reanalisar".
- Relatório existente mas sem extração de materiais concluída: aviso de que a leitura por IA está pendente.

## Detalhes técnicos

- Novo hook `src/hooks/useAuvoTaskReport.ts`: recebe `auvo_task_uid` e busca em paralelo `auvo_tasks` (dados do atendimento), `auvo_task_reports` (report_text, questionnaire, attachments, extraction_status) e `auvo_report_materials` (mentioned_name, quantity, unit, source_excerpt, confidence). Query habilitada apenas quando o diálogo está aberto.
- Novo componente `src/components/admin/auvo/AuvoTaskReportView.tsx` para renderizar relatório, materiais, questionário e anexos, reutilizável fora do diálogo.
- `src/pages/admin/AuvoAudit.tsx`: o `DialogContent` de revisão passa a layout mais largo (`max-w-4xl`) em duas colunas — relatório à esquerda, decisão/observações à direita — com rolagem interna. Nenhuma alteração na mutação de revisão.
- Reaproveitar a formatação de moeda/data já existente no arquivo; sem mudanças de banco, RLS ou Edge Functions.
