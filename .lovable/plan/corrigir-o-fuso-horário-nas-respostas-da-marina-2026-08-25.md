# Corrigir o fuso horário nas respostas da Marina

## O que está acontecendo (verificado no código)

- As funções de backend rodam em UTC. Nenhum ponto do assistente converte para o horário de Brasília: não existe nenhuma referência a `America/Sao_Paulo` em `supabase/functions/ai-assistant/` nem em `_shared/`.
- O horário da última sincronização que a Marina cita vem cru do banco (`ultima_sincronizacao: local.updated_at` em `insights.ts`) e o modelo apenas repete o valor. 14:46 é o horário UTC do evento que, no Brasil, aconteceu às 11:46.
- O mesmo problema afeta a noção de "agora": o prompt injeta apenas `Hoje é <data>` calculado em UTC, sem hora e sem fuso. Depois das 21h locais, a Marina passa a achar que já é o dia seguinte.
- Os interpretadores de "hoje/amanhã/semana que vem" também usam `new Date()` em UTC, então perto da virada do dia eles apontam para a data errada.

## O que vou corrigir

### 1. Um único relógio: horário de Brasília
- Criar um utilitário compartilhado de data/hora no fuso `America/Sao_Paulo` (agora, data de hoje, formatação de data e hora em pt-BR).
- Todo cálculo de "hoje", "este mês", "amanhã", "esta semana" passa a usar esse relógio, não o UTC do servidor.

### 2. A Marina passa a saber que horas são
- O prompt passa a informar data **e** hora atuais em Brasília, com o fuso explícito, e a regra de que todo horário citado ao usuário é horário de Brasília.
- Regra de saída: nunca exibir data/hora no formato técnico (ISO/UTC). Sempre "25/08/2026 às 11:46".

### 3. Horários de sincronização e de faturamento formatados na origem
- Os valores de última sincronização, data de faturamento, check-in/check-out e datas de OS retornados pelas ferramentas passam a sair já convertidos e formatados em horário de Brasília, para o modelo não ter como repetir UTC.
- Onde fizer sentido, acompanhar de uma leitura amigável ("há 13 minutos"), que é imune a erro de fuso.

### 4. Conferência
- Perguntar à Marina "quando o Omie foi sincronizado pela última vez?" e comparar com o horário real do registro no banco.
- Perguntar "que horas são?" e "quantas OSs foram faturadas hoje?" para validar o relógio e o recorte de dia.
- Repetir a checagem perto da virada do dia (após 21h locais) para garantir que "hoje" não pula para amanhã.

## Detalhes técnicos

- Novo `supabase/functions/_shared/datetime.ts`: `nowInSp()`, `spToday()` (YYYY-MM-DD no fuso local), `formatDateTimeBR(iso)`, `formatDateBR(iso)`, `relativeFromNow(iso)` — todos usando `Intl.DateTimeFormat` com `timeZone: "America/Sao_Paulo"`.
- `ai-assistant/index.ts`: `today` (linha ~1548) e o bloco `Hoje é ...` (linha ~1656) passam a usar o relógio local com hora; o parser de datas relativas (linhas ~1811-1942) troca `new Date()` pelo `nowInSp()`; nova regra no bloco de regras técnicas proibindo horário técnico/UTC na resposta.
- `ai-assistant/insights.ts`: `ultima_sincronizacao` e demais campos de data/hora devolvidos por `get_os_billing_summary`, `run_integration_sync` e `get_os_billing_status` passam por `formatDateTimeBR`, mantendo o valor bruto em um campo separado só para comparação interna.
- `ai-assistant/tools.ts`: mesma normalização em `omie_last_sync`, `last_synced_at`, `verificado_em` e nos recortes de período (`toISOString().slice(0,10)`) que hoje usam UTC.
- Sem tabela nova e sem alteração de RLS. Deploy de `ai-assistant` ao final.
