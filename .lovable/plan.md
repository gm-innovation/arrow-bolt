
# Regeneração dos PDFs no padrão Lecsor v4

## Problemas confirmados nos PDFs atuais
- **Logo errada**: usa "googlemarine" (extraída do `/lovable-uploads/99776afb…png` do Arrow) em vez da Lecsor Technology.
- **Faixa azul-marinho gigante** ocupando ~15% do topo de todas as páginas — não existe no v4.
- **Capa fora do padrão**: v4 tem capa branca, logo centralizada, título centralizado sem tabela.

## Padrão v4 a ser replicado
- Fundo 100% branco, sem faixas coloridas.
- Cabeçalho: apenas logo Lecsor pequena no topo (ou nada em páginas internas).
- Capa centralizada: logo Lecsor → "Manual de Uso" → subtítulo → bloco de metadados em texto simples (Versão / Data / Responsável / Substitui).
- Sumário como lista simples com pontilhado até o número da página.
- Corpo em serifada/sans neutra, tinta preta, sem barras coloridas nas seções.
- Rodapé discreto em cinza: "Manual SGQ Arrow · v6 · 01/07/2026 · pág X/Y".

## Ações

1. **Trocar a logo**
   - Usar `src/assets/lecsor-logo-black.png` (asset já existente no projeto, referenciado via `.asset.json`).
   - Baixar o arquivo pela URL do asset (`/__l5e/assets-v1/f685e18f…/lecsor-logo-black.png`) para `/tmp/browser/manual-v5/lecsor.png`.
   - Remover totalmente o uso do upload `99776afb…` (googlemarine).

2. **Remover a faixa azul**
   - No `build_pdfs.py`, eliminar o `Rect` / `Frame` de fundo navy do cabeçalho fixo.
   - Header interno = apenas a logo Lecsor à esquerda (~90×32 px) + linha fina cinza opcional.
   - Zerar `topMargin` extra que foi adicionado para acomodar a faixa.

3. **Recriar capa no padrão v4**
   - Logo Lecsor centralizada (~180 px de largura).
   - Título "Manual de Uso" (ou "Adendo v4.2") em display bold, centralizado.
   - Subtítulo "Módulo de Qualidade — Sistema Arrow".
   - Bloco de metadados em texto centralizado (sem tabela), linhas: Versão, Data de revisão, Responsável, Substitui.

4. **Ajustar cores/estilos internos**
   - Trocar acentos navy `#0f172a` por preto/cinza neutro nos títulos.
   - Manter hyperlinks reais em azul discreto (`#1d4ed8`) apenas nas URLs.
   - Manter sumário clicável, bookmarks, capturas anotadas e links externos (essa parte funciona bem).

5. **Regerar como novos arquivos versionados**
   - `/mnt/documents/adendo-sgq-arrow_v4.2.pdf`
   - `/mnt/documents/manual-uso-sgq-arrow_v6.pdf`
   - (não sobrescrever v4.1 / v5, conforme regra de artefatos)

6. **QA visual obrigatório**
   - `pdftoppm -jpeg -r 120` em ambos os PDFs.
   - Inspecionar capa, sumário e ao menos 3 páginas internas.
   - Checklist: sem faixa azul, logo Lecsor legível, sem "googlemarine", sumário clicável, links funcionando, rodapé correto, sem clipping/overflow.

## Fora de escopo
- Reescrever conteúdo textual — o texto atual do v5 e do adendo v4.1 é mantido; muda apenas o layout/identidade visual.
- Recapturar screenshots — os PNGs em `/tmp/browser/manual-v5/screenshots/` são reaproveitados.
