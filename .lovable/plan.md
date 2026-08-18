# Relatório PDF — divergências "Baixado do estoque, sem relato" (7 OS)

Entrega: um PDF único de auditoria, gerado como artefato para download (não é tela nova no Arrow), cobrindo as OS 4821, 4475, 4766, 4706, 5370, 5229 e 5289 — com evidência cruzada entre relatório real do técnico, saídas/retornos de estoque (LOGVI) e o estado da OS no Omie (extraído do documento que você enviou).

## O que já está confirmado na base

- As 7 OS têm divergência registrada; "baixado do estoque sem relato" aparece em todas (risco atual: 4821 R$ 12.344,19 · 4475 R$ 2.478,00 · 4766 R$ 686,70 · 4706 R$ 517,75 · 5370 R$ 440,00 · 5229 R$ 330,00 · 5289 R$ 108,00), além de 1 divergência de quantidade na 4821.
- Os relatórios reais existem e são múltiplos por OS: 4821 tem 7 atendimentos (5 com texto), 4706 tem 5 (3 com texto), e 5229/5289 têm atendimento **sem nenhum texto de relatório** — o que por si só é um achado.
- Já há sinais de incoerência temporal e de nome: na 4821 o Auvo registra embarcações diferentes no mesmo serviço (SIEM PILOT nos atendimentos de maio/julho e SISTAC ESPERANÇA em 08/05) enquanto o Omie fatura "Sistac Esperança e Sistac Vitoria"; e há saída de estoque em 11/08/2026 para a 4821 e para a 4706, muito depois do serviço e do faturamento previsto (13/05/2026 na 4821).

## Como o relatório será montado

1. **Fonte de verdade dos relatórios**: puxar de novo do Auvo, por OS, todos os atendimentos e relatórios (texto, questionário e legendas de foto), sem depender só do que já está gravado — assim o PDF cita trecho literal de cada relatório e a contagem real de atendimentos.
2. **Fonte de verdade do estoque**: reler as saídas e os retornos da LOGVI para cada OS (quantidade, custo unitário, moeda, técnico, responsável pela baixa, data e hora), preservando USD quando for o caso e mostrando o valor convertido ao lado do original.
3. **Estado da OS no Omie**: extrair do documento enviado o estado (faturada / aguardando faturamento / pendente), cliente, embarcação declarada, valores, competência, previsão e data de faturamento, e o material declarado na medição.
4. **Cruzamento e classificação** de cada linha, por OS.

## Divergências que o PDF vai evidenciar

- **Material baixado sem relato**: item, quantidade, custo (moeda original e em BRL), quem baixou, quem autorizou, e a confirmação de que nenhum dos relatórios da OS o menciona.
- **Cronologia impossível**: saída de material depois do último check-out, depois do fechamento/faturamento ou depois da competência da OS; retorno anterior à saída; saída anterior à abertura da OS.
- **Retornos que anulam ou não anulam a baixa**: saldo líquido (saída − retorno) por item, apontando quando o "risco" cai a zero e quando sobra saldo consumido sem relato.
- **Nomes de embarcação/cliente divergentes** entre relatório do técnico, cadastro do Auvo, medição e Omie (ex.: SIEM PILOT × SISTAC ESPERANÇA × "Sistac Esperança e Sistac Vitoria"; "ASSO VENTISETTE" × "ASSO VETISETTE" no certificado).
- **Relatório ausente ou vazio** em atendimento concluído, e atendimento sem check-in/check-out.
- **Material declarado na medição/Omie sem baixa correspondente no estoque** e o inverso (baixa sem material declarado na medição faturada).
- **Divergência de valor**: custo do estoque × valor cobrado do cliente na medição (ex.: Kit Overhaul a R$ 2.478,00 no estoque e R$ 4.460,40 na medição da 4475).
- **Check-outs suspeitos** (duração de segundos/minutos incompatível com o serviço).

## Estrutura do PDF

- Capa com identidade Lecsor/Googlemarine, período auditado e fontes usadas.
- Sumário executivo: risco total, risco por OS, contagem de achados por tipo.
- Uma seção por OS: cabeçalho (cliente, embarcação, estado no Omie, valores, datas-chave), tabela de saídas, tabela de retornos, tabela de relatórios (data, técnico, trecho citado, fotos), e a lista de achados classificados por severidade com a evidência ao lado.
- Anexo com a linha de tempo consolidada de cada OS (serviço → saída → retorno → fechamento → faturamento).
- Encerramento com recomendações de controle.

## Detalhes técnicos

- Geração em Python com ReportLab (fonte Unicode registrada para acentuação), saída em `/mnt/documents` e disponibilizada para download; nenhuma alteração no app.
- Leitura do Auvo e da LOGVI via as funções de integração já existentes (`auvo-sync`, endpoints de saídas e retornos), usando os segredos já configurados; nada de credencial no relatório.
- Cotação USD→BRL explicitada no PDF (mesma variável já usada na auditoria) para que o número seja auditável.
- QA obrigatório: cada página convertida em imagem e revisada antes da entrega.

## O que preciso de você

Nada além do que já enviou — se a cotação USD a usar for diferente da atual, me diga o valor.
