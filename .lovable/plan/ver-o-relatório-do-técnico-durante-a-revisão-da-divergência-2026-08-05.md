# Ver o relatório do técnico durante a revisão da divergência

Hoje, ao clicar em "Revisar" na tela de Auditoria Auvo × Estoque, o coordenador vê apenas o nome do material, a nota da IA e o trecho curto citado. Para decidir se a divergência é real, ele precisa abrir o Auvo. A revisão passa a mostrar o relatório completo do atendimento dentro do próprio diálogo.

## O que muda

No diálogo "Revisar divergência", acima do campo de conclusão:

- **Resumo do atendimento**: OS, cliente, técnico, data, check-in/check-out.
- **Seção "Material Fornecido" em destaque**: o bloco final do relatório (F. MATERIAL FORNECIDO / MATERIAIS FORNECIDOS) aparece primeiro, em card destacado, porque é a lista que vale para a auditoria.
- **Relatório completo do técnico**: texto integral em área com rolagem, logo abaixo do destaque.
- **Materiais reconhecidos pela IA**: nome mencionado, quantidade, unidade e trecho de origem.
- **Questionário do Auvo**: pares pergunta/resposta, quando existirem.
- **Fotos e anexos**: miniaturas que abrem em modal na própria página (lightbox), com navegação anterior/próxima e contador — sem abrir nova aba.
- **Comparativo da divergência**: quantidade baixada no estoque × quantidade relatada, com classificação e valor em risco.

Regra de auditoria ajustada: a extração de materiais passa a valer apenas o que está declarado em "Material Fornecido". Menções soltas no corpo dos trabalhos executados deixam de gerar divergência de material — hoje elas geram os casos "Relatado, sem baixa no estoque" com trechos do texto corrido. Quando o relatório não tiver essa seção, o sistema não infere materiais e marca o atendimento como "sem lista de material declarada", em vez de acusar divergência.

Estados tratados:
- Atendimento sem relatório importado: aviso "Relatório não disponível no Auvo" com sugestão de usar "Reanalisar".
- Relatório sem seção de material: aviso explícito de lista não declarada.

## Detalhes técnicos

- Novo hook `src/hooks/useAuvoTaskReport.ts`: por `auvo_task_uid`, busca `auvo_tasks`, `auvo_task_reports` (report_text, questionnaire, attachments, extraction_status) e `auvo_report_materials` (mentioned_name, quantity, unit, source_excerpt, confidence). Habilitado só com o diálogo aberto.
- Novo `src/lib/auvo/reportSections.ts`: parser de seções do relatório (`A.` a `F.`, tolerando variações como "F. MATERIAL FORNECIDOS", "F. MATERIAIS FORNECIDOS", ausência de espaço) para isolar o bloco de material fornecido.
- Novo `src/components/admin/auvo/AuvoTaskReportView.tsx`: renderiza destaque, relatório, materiais, questionário e galeria; usa um lightbox local (`Dialog` do shadcn com estado de índice) para as fotos.
- `src/pages/admin/AuvoAudit.tsx`: diálogo de revisão em `max-w-4xl`, duas colunas (relatório à esquerda, decisão/observações à direita) com rolagem interna. Mutação de revisão inalterada.
- `supabase/functions/auvo-sync/crosscheck.ts`: o prompt de extração passa a receber apenas a seção "Material Fornecido" (isolada pelo mesmo parser, portado para a função) e é instruído a não inferir materiais fora dela; sem a seção, retorna lista vazia. As divergências existentes geradas pelo corpo do texto são reprocessadas via "Reanalisar" ou na próxima sincronização.
- Sem mudanças de schema, RLS ou storage.

