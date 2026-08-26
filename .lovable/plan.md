# Agenda: usar as cores/badges da legenda nos eventos

Hoje a legenda do cabeçalho (Férias, Folga, Atestado, Treinamento, Sobreaviso, Reservado, Auvo) só é aplicada aos registros internos de ausência e sobreaviso. As atividades vindas do Auvo — inclusive as que são claramente férias, folga, sobreaviso, ASO ou indisponibilidade — aparecem todas com o mesmo ponto colorido de status e um chip cinza "Auvo", como na captura enviada. Resultado: visualmente tudo parece igual.

## O que muda

1. **Classificação do evento por tipo**: cada atividade da agenda passa a receber uma categoria (férias, folga, atestado/ASO, treinamento, sobreaviso, reservado, indisponível, serviço/Auvo, OS interna) a partir do título/tipo da tarefa, não só da origem.
2. **Badge visual igual à legenda**: o item do dia ganha o mesmo par ícone + cor do badge do cabeçalho (fundo claro, borda e ícone), com o rótulo em badge (ex. "Férias") em vez do texto cru em maiúsculas.
3. **Consistência entre visões**: mesma marcação em Semana, Mês, Dia e no modal "+N atividades".
4. **Legenda clicável (filtro)**: clicar num badge do cabeçalho filtra/oculta aquela categoria na agenda, para isolar rapidamente férias ou sobreavisos. Badge ativo/inativo com destaque visual.
5. **Ordenação por relevância dentro do dia**: OSs com horário primeiro, depois ausências/férias/sobreaviso, preservando o comportamento atual de "+N".

Nada de lógica de negócio, sincronização ou dados muda — é só classificação e apresentação no frontend.

## Detalhes técnicos

- Novo módulo `src/components/admin/calendar/eventStyles.ts`: fonte única com `CalendarCategory`, mapa de cor/ícone/rótulo (os mesmos valores hoje duplicados em `CalendarLegend`, `WeekView` e `MonthView`) e função `classifyEvent(order)` que normaliza `vessel_name`/`task_type`/`status` (sem acento, maiúsculas) para detectar FÉRIAS, FOLGA, ATESTADO/ASO, TREINAMENTO, SOBREAVISO, RESERVADO, INDISPONÍVEL; fallback `auvo` ou `os`.
- `CalendarLegend.tsx`: consome o mapa central e recebe `activeCategories` + `onToggleCategory` (opcionais) para o filtro.
- `ServiceOrderListItem.tsx`: aplica classes de categoria no container (fundo/borda-esquerda) e troca o chip "Auvo" por badge de categoria com ícone; mantém ponto de status apenas para OSs de serviço.
- `WeekView.tsx` / `MonthView.tsx` / `DayView.tsx`: passam a importar `absenceConfig` do módulo central e aplicam o filtro de categorias antes de fatiar visíveis/`+N`.
- `DayEventsDialog.tsx`: badge de categoria ao lado do título, no lugar do badge de status genérico.
- `ServiceCalendar.tsx`: estado `activeCategories` (todas ativas por padrão) e repasse para legenda e visões.
