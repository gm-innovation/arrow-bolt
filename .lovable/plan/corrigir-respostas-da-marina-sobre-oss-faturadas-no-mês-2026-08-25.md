# Corrigir respostas da Marina sobre OSs faturadas no mês

## Diagnóstico verificado

- A tabela de OSs já possui os campos necessários para faturamento: `omie_billed`, `omie_billed_date`, `omie_etapa`, `omie_created_date` e `company_id`.
- Para a empresa consultada, o banco mostra:
  - **3.755 OSs faturadas no total** (`omie_billed = true` / etapa 60).
  - **64 OSs faturadas neste mês**, filtrando por `omie_billed_date` dentro do mês atual.
- A Marina respondeu **3.755** porque a ferramenta atual de painel operacional retorna `faturadas_no_omie` como total histórico, sem filtro mensal.
- No pedido seguinte, os logs mostram que a resposta foi bloqueada por citar bastidor técnico (`query_omie_live`), e não houve execução efetiva da consulta ao vivo ao Omie depois disso.

## O que vou corrigir

### 1. Contagem correta de faturadas por período

- Criar uma leitura específica para faturamento de OSs, com parâmetros de período:
  - mês atual por padrão quando o usuário disser “este mês”;
  - mês/ano explícitos quando o usuário informar;
  - intervalo de datas quando necessário.
- A contagem mensal será feita por **data real de faturamento no Omie** (`omie_billed_date`), não por data de criação da OS nem por total histórico.
- A resposta deve diferenciar claramente:
  - “faturadas no mês”;
  - “faturadas no total histórico”;
  - “concluídas aguardando faturamento”.

### 2. Ajustar o painel operacional da Marina

- Atualizar `get_operations_dashboard` para incluir campos separados:
  - `faturadas_total`;
  - `faturadas_no_mes`;
  - `aguardando_faturamento`;
  - `concluidas_a_faturar`.
- Evitar nomes ambíguos como `faturadas_no_omie` quando o usuário perguntou por período.
- Atualizar a descrição da ferramenta para forçar uso de filtro mensal em perguntas como “faturadas esse mês”.

### 3. Busca ao vivo no Omie sem perguntar “como prosseguir”

- Adicionar uma ferramenta/leitura ao vivo para listar/contar OSs faturadas no Omie por período, usando os filtros disponíveis da API e validando `cFaturada = S` e data de faturamento.
- Quando o usuário corrigir a Marina ou pedir “busque direto no Omie”, ela deve executar a consulta ao vivo imediatamente, sem pedir autorização ou perguntar como proceder.
- A resposta deve citar a fonte em linguagem simples: “segundo o Omie agora”.

### 4. Guardrail de saída mais seguro

- Ajustar o bloqueio de bastidores para, quando a Marina citar uma ferramenta interna, reescrever/retentar a resposta sem expor nomes técnicos, mas **sem transformar isso em pergunta ao usuário**.
- Se o usuário pediu uma consulta e ela ainda não foi feita, o sistema deve forçar nova tentativa de ferramenta de leitura antes da resposta final.

### 5. Testes de validação

- Testar no backend as perguntas:
  - “Quantas OSs foram faturadas esse mês?” → deve retornar a contagem mensal por `omie_billed_date`.
  - “Quantas OSs foram faturadas no total?” → deve retornar o total histórico.
  - “Busca direto no Omie apenas as faturadas esse mês” → deve consultar o Omie ao vivo e não perguntar como prosseguir.
- Conferir logs para garantir que a Marina chamou a ferramenta correta e não expôs nomes internos.

## Detalhes técnicos

- Arquivos previstos:
  - `supabase/functions/ai-assistant/insights.ts`
  - `supabase/functions/ai-assistant/index.ts`
  - possivelmente `supabase/functions/omie-proxy/index.ts`, se a API atual não expuser listagem por período/faturamento.
- A regra principal será: **pergunta com “mês”, “período”, “hoje”, “semana” ou datas explícitas nunca pode usar contador histórico sem filtro de data**.
- Não será criada tabela nova; portanto não há mudança de RLS prevista.
