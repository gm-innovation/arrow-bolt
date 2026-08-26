# Disponibilidade da equipe pela agenda do Auvo (e por período)

## Resposta curta

Hoje a Marina responde "quem está disponível / em atendimento", mas **só para um dia** e **sem seguir a agenda do Auvo** como fonte da operação. A ferramenta atual (`get_team_status`):

- aceita apenas uma data (`date`), não um período;
- marca "em atendimento" por check-in aberto no Auvo (isso já está certo);
- mas monta "alocado" a partir das visitas de OS do Arrow/Omie (`visit_technicians`), e **não** das tarefas agendadas no Auvo — justamente o contrário da regra que a agenda do Arrow passou a seguir (só entra o que existe no Auvo);
- ausências vêm só do RH (`get_technician_availability_v2`), então Férias/Folga/Sobreaviso lançados **no Auvo** não contam.

Resultado: ela pode dizer que alguém está livre num dia em que a agenda do Auvo mostra tarefa, ou dizer que está alocado num dia em que a agenda do Arrow não mostra nada.

## O que será feito

### 1. Alocação pela agenda do Auvo
A situação de cada técnico passa a ser calculada a partir das tarefas do Auvo do período (`auvo_tasks`, casando pelo nome do técnico como a agenda já faz), com o número da OS quando existir. Trabalho interno (bancada/laboratório) e tarefas fora da agenda seguem a mesma regra de exclusão usada na agenda, para Marina e tela não divergirem.

### 2. Consulta por período
`get_team_status` ganha `start_date` e `end_date` (mantendo `date` para um dia só). A resposta traz, por técnico: dias livres, dias ocupados e o que ocupa cada dia — mais um resumo do período ("Fulano livre 27 e 28/08; ocupado 24-26 na OS 5338").

### 3. Ausências das duas fontes
Férias, folgas, atestados e sobreaviso passam a considerar tanto o RH quanto as tarefas de ausência do Auvo, com a origem indicada no motivo.

### 4. Prompt da Marina
Regra N2 atualizada: disponibilidade sempre por `get_team_status`, aceitando período; ela deve dizer que a base é a agenda do Auvo e, quando a data for futura além do sincronizado, avisar e oferecer a busca ao vivo (`query_auvo_live`).

## Detalhes técnicos

- `supabase/functions/ai-assistant/insights.ts`: `get_team_status` com janela de datas; busca única em `auvo_tasks` por `task_date` no intervalo; classificação por dia (ocupado/ausência/sobreaviso/em atendimento) reaproveitando a mesma normalização de nome e os mesmos padrões de tipo usados em `src/components/admin/calendar/eventStyles.ts`; `get_technician_availability_v2` chamado por técnico apenas nas datas do intervalo (batch com limite para não estourar tempo).
- Mantém `visit_technicians` apenas como reforço quando houver tarefa Auvo correspondente, nunca como fonte isolada.
- `supabase/functions/ai-assistant/index.ts`: ajuste da regra N2 do prompt.
- Sem mudança de schema, RLS ou UI. Deploy de `ai-assistant` e teste com "quem está disponível entre 27 e 29/08" e "quem está em campo agora".
