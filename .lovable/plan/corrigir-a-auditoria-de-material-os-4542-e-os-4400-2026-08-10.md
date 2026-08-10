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

No estoque a OS 4400 tem **9 linhas de saída com 6 produtos distintos** e **1 retorno** (Conversor SDI p/ HDMI). O endpoint atual devolve menos linhas e sem quantidade — parte disso se resolve na correção do endpoint que você pediu.

Do nosso lado há um problema independente: a auditoria filtra os itens de saída pela grafia do nome da embarcação e descarta silenciosamente as linhas que não casam. Isso é errado por princípio — a OS é o vínculo. Não vou afirmar que a 4400 tem grafias divergentes (você não encontrou outra grafia de "Parcel do Bandolim"); a verificação de qual grafia veio em cada linha entra como primeiro passo da implementação, e o resultado fica registrado na tela.

Correções:
- **O número da OS é o critério.** Consulta feita por número de OS: todos os itens retornados entram na auditoria, sem nenhum filtro por embarcação.
- Remover o descarte por embarcação no fluxo de saídas; o nome da embarcação fica apenas informativo no card do item.
- Manter similaridade (embarcação, data, tipo, técnico) **somente** onde ela é necessária: agrupamento de serviços sem número de OS e casamento de devoluções sem OS.
- Registrar no resultado da sincronização quantos itens vieram por OS, para conferir contra a tela do estoque (esperado para a 4400: 6 produtos e 1 devolução).
- Saídas em datas diferentes na mesma OS continuam somadas por produto.

## 3b. Material baixado em uma OS e usado em outra (OceanPact / Parcel do Bandolim)

Clientes como a OceanPact exigem **uma OS por serviço**. Na prática o material sai do estoque na OS 4400 e é aplicado no serviço da OS 4558 — o relatório da 4400 não menciona esse item e o da 4558 menciona um item que não teve baixa na própria OS. Hoje isso gera **dois falsos positivos** ao mesmo tempo: "baixado sem relato" na 4400 e "relatado sem baixa" na 4558.

Como vai funcionar:
- Depois do cruzamento por OS, roda uma segunda passada que procura, entre as OS **do mesmo cliente/embarcação** e dentro de uma janela de tempo (padrão 60 dias), pares complementares: mesmo produto com sobra de baixa em uma OS e sobra de relato em outra.
- Ao casar, as duas linhas mudam de status para **"Baixado em outra OS do mesmo serviço"** (severidade baixa, risco financeiro zero), com link cruzado: no card da 4400 aparece "aplicado na OS 4558"; no card da 4558, "baixado na OS 4400".
- O casamento é por quantidade: se a 4400 baixou 3 e a 4558 relatou 2, 2 unidades ficam conciliadas e 1 permanece como divergência real.
- Casamento é uma **sugestão auditável**: o revisor pode confirmar ou desfazer o vínculo, e o desfazer não é refeito automaticamente (mesmo padrão do descarte de duplicatas já existente).
- Quando não há OS complementar, nada muda: continua divergência crítica.
- A conciliação entre OS ocorre **antes** de considerar o item como sem relato, e depois do abatimento das devoluções LOGVI.




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
- Conciliação entre OS: nova etapa em `crosscheck.ts` (ou `crossOsReconcile.ts`) executada após o cruzamento por grupo, consultando `auvo_material_discrepancies` do mesmo cliente/embarcação na janela de 60 dias; novo status `cross_os_matched` com colunas de vínculo (`matched_group_id`, `matched_order_number`, `matched_quantity`) e tabela de dispensa/confirmação no padrão de `auvo_merge_dismissals`.
- `src/components/admin/auvo/AuvoTaskReportView.tsx` e o card de divergência: exibir todas as seções de material, o vínculo cruzado entre OS e o aviso de baixa estimada.
- Migração pontual devolvendo ao status `pending` os grupos afetados para disparar a reauditoria.
