## Corrigir tabela mestra — manter tudo em A4 retrato

O usuário vê as páginas da tabela mestra mais largas que as demais porque estão em A4 paisagem enquanto o resto está em A4 retrato. Ao imprimir/visualizar no leitor, o paisagem aparece "estourando" o A4 portrait. Solução: deixar a tabela mestra também em **A4 retrato**, com colunas que cabem e quebram texto automaticamente.

### Mudanças no script `/tmp/gen_map_pdf.py`

1. Remover o `PageTemplate` paisagem e os `NextPageTemplate('landscape'/'portrait')` em volta da tabela mestra — usar somente o frame retrato.
2. Recalcular larguras com base em `PORT_WIDTH` (≈ 18 cm úteis com margem 1,5 cm):
   - Grupo 15% · Tela 17% · Rota 22% · Arquivo 21% · Função 25%
3. Reduzir fonte das células para 7,5 pt (cabeçalho 8 pt em bold) e padding 2 pt; já usamos `Paragraph` com `wordWrap='CJK'` para quebrar rotas/arquivos longos.
4. Manter `repeatRows=1` para repetir o cabeçalho a cada quebra de página.
5. Salvar como `/mnt/documents/sgq-mapa-de-telas_v3.pdf` (preservar v1 e v2).
6. QA: rasterizar todas as páginas com `pdftoppm` e inspecionar visualmente — todas as páginas devem ter exatamente a mesma largura A4 retrato e nenhuma coluna deve transbordar.

### Critério de aceite

- Todas as páginas do PDF têm o mesmo tamanho (A4 retrato).
- Tabela mestra ocupa a largura útil sem cortar texto, com células que quebram em múltiplas linhas se necessário.
- Cabeçalho da tabela se repete em cada página da tabela.
