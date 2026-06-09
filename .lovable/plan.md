## Objetivo
Corrigir o PDF `sgq-mapa-de-telas.pdf` cujas 3 primeiras páginas têm tabelas estouradando a margem direita / sendo cortadas na impressão.

## Diagnóstico
O script atual de geração (Python + reportlab) monta a Tabela Mestra com larguras de coluna fixas que somam mais que a área útil da página A4, e usa células de texto puro (sem wrap), o que faz colunas longas (Rota, Arquivo, Função) sangrarem para fora da página.

## Mudanças no script de geração do PDF
1. **Página A4 paisagem** (`landscape(A4)`) só para as seções de tabela larga (Tabela Mestra), mantendo retrato para as demais.
2. **Recalcular larguras de coluna** com base em `doc.width` (somando exatamente 100% da área útil), em vez de valores fixos em cm.
3. **Envolver o conteúdo das células em `Paragraph`** com estilo `wordWrap='CJK'` para quebrar linha automaticamente em rotas/arquivos longos.
4. **Reduzir fonte da tabela** para 8pt e padding para 3pt, garantindo respiro.
5. **Margens** uniformes de 1,5 cm em todos os lados.
6. **`repeatRows=1`** na Table para o cabeçalho se repetir nas quebras de página automáticas (sem precisar de `KeepTogether`, que poderia explodir tabelas muito longas).
7. Reexecutar o script, salvar em `/mnt/documents/sgq-mapa-de-telas.pdf` e fazer QA visual com `pdftoppm` nas 3 primeiras páginas para confirmar que nada está cortado.

## Sem mudanças
- Conteúdo textual, estrutura de seções e ordem permanecem idênticos ao PDF atual.
- Nenhum arquivo do app (`src/`) é alterado — é só regeneração do artefato em `/mnt/documents/`.
