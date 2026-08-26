# Agenda: só o que está agendado no Auvo na data

## O que está errado hoje (verificado no banco)

- **OS 5404** aparece em 26/08, mas sua única tarefa Auvo é de **22/07** e do tipo **"MANUTENÇÃO CORRETIVA EM BANCADA"** (trabalho interno de laboratório).
- **OS 5540** aparece em 26/08, mas suas tarefas Auvo são de **21/08**.

Causa: o vínculo com o Auvo hoje é verificado **por OS, sem comparar a data**. Basta existir qualquer tarefa Auvo ligada à OS (em qualquer data) para o cartão entrar na agenda na data do Omie/Arrow.

## O que será feito

1. **Vínculo por data, não por OS**: a OS só entra na agenda se existir tarefa Auvo vinculada **na mesma data** do cartão. O enriquecimento (embarcação, equipe, escopo, local, horário) passa a usar a tarefa daquela data.
2. **Trabalho interno fora da agenda**: tarefas cujo tipo indica bancada/laboratório/interno (ex.: "EM BANCADA", "LABORATÓRIO", "INTERNO") não geram evento na agenda — nem como OS, nem como cartão "Auvo".
3. Ausências do RH (férias, folgas, atestados) e sobreaviso continuam aparecendo normalmente.

## Efeito prático

Em 26/08, 5404 e 5540 deixam de aparecer (seguem normalmente na lista de OSs); a agenda passa a refletir exatamente o que os técnicos têm agendado no Auvo naquele dia.

## Detalhes técnicos

- `src/components/admin/calendar/ServiceCalendar.tsx`:
  - `fetchAuvoOrderEnrichment` passa a receber a janela (`startStr`/`endStr`) e a data agendada de cada OS, indexando o enriquecimento por `service_order_id + task_date` e devolvendo apenas a tarefa da data do cartão.
  - `hasAuvo` valida o par OS+data (em vez de só `order.id`).
  - Novo helper de classificação de trabalho interno por `auvo_task_type` (normalizado sem acento), aplicado tanto no filtro das OSs quanto em `fetchStandaloneAuvoEvents`.
- Sem mudança de schema, de sincronização ou dos hooks de lista de OSs.
