# Corrigir a auditoria de material (OS 4542 e OS 4400)

Três causas confirmadas por leitura de código e chamada real das APIs.

## 1. Falso aviso "o relatório não traz a seção de material fornecido" (OS 4542)

O leitor de seções só aceita cabeçalho no formato `A. Título`. No relatório da 4542 o técnico usou `A)`, `B)`, `F)` e até `D )`. Nenhuma seção é reconhecida, o relatório é tratado como "sem lista declarada" e o `F) 02 kits de Overhaull.` é ignorado.

O mesmo relatório traz **dois blocos A–F** (Gyros e DGPS) e o leitor devolve apenas a primeira seção de material encontrada — o material do segundo bloco se perderia.

Correções:
- Aceitar `A)`, `A.`, `A -`, `A:` e espaço antes do separador.
- Reconhecer **todas** as seções de material do relatório e concatená-las, identificando o bloco de origem.
- "Sem material declarado" só quando nenhum bloco declara; "sem fornecimento" só quando todos dizem "Na"/nenhum.
- Aplicar nas duas cópias do leitor (tela de revisão e função de sincronização).

## 2. Quantidade da saída (endpoint e resposta)

O endpoint de saídas usado hoje é:

```text
GET https://api.eva-googlemarine.com/departamentos/suprimentos/get-os-data?numero_os=4542
(sem autenticação)
```

Resposta real (OS 4542):

```json
{"ok":true,"meta":{"os_numero":"4542","count":1},
 "data":[{"produto_id":125,"codigo":"PRD00089","nome":"KIT OVERHAUL STD22",
          "custo_unitario":"2478.00","embarcacao":"SIEM MARAGOGI"}]}
```

Não há campo de quantidade: a auditoria conta linhas, por isso "Baixa no estoque: 1" onde o LOGVI mostra 2. A estrutura `movimentacao` + `itens[].quantidade` é a dos **retornos**, que já lemos com quantidade correta.

Correções:
- Ler quantidade do payload de saídas de forma tolerante (`quantidade`/`quantity`/`qtd`, inclusive dentro de `itens[]`, no mesmo padrão do leitor de retornos), para funcionar sozinho quando o endpoint corrigido entrar no ar; sem o campo, continuar somando linhas.
- Não acusar divergência quando o relatado for **maior ou igual** à baixa registrada — aí é a baixa importada que está subdimensionada; o item vira "Conferido" com nota explicativa.
- No card, rotular como "baixa registrada (estoque)" e sinalizar quando a quantidade veio estimada por linhas.

## 3. Materiais faltando na auditoria da OS 4400

No estoque a OS 4400 tem **9 linhas de saída com 6 produtos distintos** (Filtro de linha 2, Régua de tomada 1+1+1, Conversor HDMI/TVI 3, Extensor HDMI 2, Bandeja fixa 1+3, Distribuidor BNC 10) e **1 retorno** (Conversor SDI p/ HDMI, 2).

O endpoint atual devolve 8 linhas sem quantidade e traz o produto retornado (PRD00261) como saída, ou seja: já divergente da tela de estoque — parte disso se resolve na correção do endpoint que você pediu. Independentemente disso, há um problema no nosso lado: a auditoria filtra os itens pela grafia do nome da embarcação (`PARCEL DO BANDOLIM`, `PARCEL DO BANDOLIN`, `BARCO PARCEL DO BANDOLIM`) e descarta silenciosamente as linhas cuja grafia não casa — Régua duplicada, Distribuidor BNC e Bandeja fixa saem da auditoria.

Correções:
- **O número da OS é o critério.** Consulta feita por número de OS: todos os itens retornados entram na auditoria, sem nenhum filtro por embarcação. Grafia divergente deixa de excluir material.
- Remover o descarte por embarcação no fluxo de saídas; o nome da embarcação fica apenas informativo no card do item.
- Manter similaridade (embarcação, data, tipo, técnico) **somente** onde ela é necessária: agrupamento de serviços sem número de OS e casamento de devoluções sem OS.
- Registrar no resultado da sincronização quantos itens vieram por OS, para conferir contra a tela do estoque (esperado para a 4400: 6 produtos e 1 devolução).
- Saídas em datas diferentes na mesma OS continuam somadas por produto (comportamento atual e correto).



## 4. Orientações da IA (prompt de extração)

- Deixar explícito que o relatório pode ter **vários blocos A–F** e que todas as seções de material valem.
- Interpretar quantidades com zero à esquerda e por extenso ("02 kits", "dois kits").
- "Na"/"N/A" em um bloco não anula o material declarado em outro.
- Manter a regra de não inferir material fora da seção declarada.

## 5. Reauditoria

Reprocessar os serviços com divergência "baixado do estoque, sem relato" e "quantidade divergente" para que casos como 4542 e 4400 sejam reclassificados com as novas regras.

## Detalhes técnicos

- `src/lib/auvo/reportSections.ts` e `supabase/functions/auvo-sync/reportSections.ts`: `SECTION_REGEX` → `^\s*([A-Z])\s*[.)\-:]\s*(.*)$`; retorno de lista de seções de material e avaliação de vazio sobre o conjunto.
- `supabase/functions/auvo-sync/crosscheck.ts`: `fetchEvaMaterials` lê quantidade quando existir e deixa de filtrar por embarcação (retorna todos os itens da OS); `extractMaterialsFromReport` recebe o texto concatenado das seções (corrige também o uso atual do objeto de seção como string); `crossCheck` classifica `reported >= stock` como `match`.
- `src/components/admin/auvo/AuvoTaskReportView.tsx` e o card de divergência: exibir todas as seções de material e o aviso de embarcação divergente / baixa estimada.
- Migração pontual devolvendo ao status `pending` os grupos afetados para disparar a reauditoria.
