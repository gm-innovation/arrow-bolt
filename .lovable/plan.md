# Agenda: apenas atividades que existem no Auvo

## Regra

O Auvo é a fonte da verdade da operação. A agenda passa a mostrar somente atividades com correspondência no Auvo:

- OS do Arrow/Omie **com** tarefa Auvo vinculada na mesma data: aparece (com número da OS e dados operacionais do Auvo).
- OS do Omie **sem** tarefa Auvo: não aparece na agenda (continua normalmente na lista de OSs).
- Tarefa Auvo sem OS: continua aparecendo com o selo "Auvo".
- Férias, folgas, atestados e sobreaviso vêm do RH e continuam aparecendo (não dependem do Auvo).

## Efeito prático

A agenda fica mais enxuta e coerente com o que os técnicos realmente têm agendado no Auvo; o "+N atividades" passa a contar só o que é real.

## Detalhes técnicos

- `src/components/admin/calendar/ServiceCalendar.tsx`: após montar `formattedOrders`, filtrar mantendo apenas as OSs cujo `order.id` tem enriquecimento em `auvoByOrder` (tarefa Auvo vinculada na janela). O filtro de OSs de teste "[QA]" continua.
- Nenhuma mudança de schema, de hook de lista de OSs ou de sincronização.
