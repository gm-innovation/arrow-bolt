# Corrigir a auditoria de material da OS 4542 (Gyros + DGPS)

Os dois problemas apontados têm causas confirmadas no código e nos dados.

## 1. "O relatório não traz a seção de material fornecido" (falso aviso)

Confirmado: o leitor de seções só reconhece cabeçalhos no formato `A. Título`. Neste relatório o técnico usou `A)`, `B)`, `F)` e até `D )` — com parêntese, não ponto. Resultado: nenhuma seção é reconhecida, o relatório é tratado como "sem lista de material" e os 2 kits de overhaul declarados em `F) 02 kits de Overhaull.` são ignorados.

Há um segundo problema no mesmo relatório: ele traz **dois blocos A–F** (Gyros e DGPS). Hoje o leitor devolve apenas a primeira seção de material encontrada. Se o primeiro bloco fosse "Na" e o segundo tivesse material, o material seria perdido — e vice-versa.

Correções:
- Aceitar `A)`, `A.`, `A -`, `A:` e espaços antes do separador como cabeçalho de seção.
- Reconhecer **todas** as seções de material do relatório (todos os blocos), concatenando-as com identificação do trabalho a que pertencem.
- Só marcar "sem material declarado" quando nenhum bloco declarar material; só marcar "sem fornecimento" quando **todos** os blocos disserem "Na"/nenhum.
- Ajustar o mesmo leitor nas duas cópias existentes (tela de revisão e função de sincronização), mantendo-as coerentes.

## 2. "Baixa no estoque: 1 · Relatado: —" quando saíram 2 unidades

Confirmado chamando o EVA para a OS 4542: a resposta traz **uma única linha** do KIT OVERHAUL STD22, sem nenhum campo de quantidade (`{"count":1, data:[{produto_id, codigo, nome, custo_unitario, embarcacao}]}`). A auditoria conta linhas, então grava baixa = 1, enquanto a tela do LOGVI mostra quantidade 2. A estrutura com `itens[].quantidade` é a do endpoint de **retornos** (que já lemos com quantidade correta); não existe hoje rota de saídas com quantidade — testei as variações e todas respondem 404.

Correções:
- Ler quantidade do payload de saídas quando ela existir (`quantidade`/`quantity`/`qtd`, inclusive em `itens[]`, no mesmo estilo tolerante do leitor de retornos), para funcionar automaticamente quando a rota passar a devolvê-la; sem o campo, continuar somando linhas.
- Nunca acusar divergência quando o relatado for **maior ou igual** à baixa registrada: aí é a baixa importada que está subdimensionada. O item passa a "Conferido", com nota explicando que o relatório declara quantidade maior que a baixa trazida pelo EVA.
- No card da divergência, rotular a baixa como "baixa registrada (EVA)" e avisar quando a quantidade veio estimada por linhas, para não ler "1 unidade" como fato.


## 3. Orientações da IA (prompt de extração)

- Instruir explicitamente que o relatório pode ter **vários blocos A–F** e que todas as seções de material valem.
- Interpretar quantidades escritas com zero à esquerda e por extenso ("02 kits", "dois kits") e o item plural ("kits de overhaul" → 2 unidades quando o número acompanha).
- Deixar claro que "Na"/"N/A" em um bloco não anula o material declarado em outro bloco.
- Manter a regra de não inferir material do corpo do serviço (itens C/D), preservando a auditoria restrita à seção declarada.

## 4. Reauditoria

Após as correções, reprocessar os serviços que hoje têm divergência do tipo "baixado do estoque, sem relato" para que casos como a OS 4542 sejam reclassificados automaticamente.

## Detalhes técnicos

- `src/lib/auvo/reportSections.ts` e `supabase/functions/auvo-sync/reportSections.ts`: novo `SECTION_REGEX` (`^\s*([A-Z])\s*[.)\-:]\s*(.*)$`), retorno de lista de seções de material e helpers `hasAnyMaterialSection` / `isEmptyMaterialSection` avaliando o conjunto.
- `supabase/functions/auvo-sync/crosscheck.ts`: `fetchEvaMaterials` passa a ler quantidade do payload; `extractMaterialsFromReport` recebe o texto concatenado das seções (corrigindo também o uso atual do objeto de seção como string); `crossCheck` classifica `reported >= stock` como `match`.
- `src/components/admin/auvo/AuvoTaskReportView.tsx`: exibir todas as seções de material encontradas.
- Migração pontual para devolver ao status `pending` os grupos com `stock_not_reported`, disparando a reauditoria.

## Pendência a confirmar

O EVA não devolve quantidade nesta OS. Se a LOGVI tiver um endpoint de **saídas** (a tela "Suprimentos - Saídas Serviços - Estoque" mostra quantidade 2), me envie a URL: com ela a baixa passa a ser exata em vez de estimada por linhas. Sem isso, a regra "relatado ≥ baixa não é divergência" já elimina o falso positivo.
