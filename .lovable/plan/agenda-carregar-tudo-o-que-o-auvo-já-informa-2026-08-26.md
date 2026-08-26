# Agenda: carregar tudo o que o Auvo já informa

## Diagnóstico (confirmado no banco, tarefa 78667058)

A tarefa "Ilha de Tinharé" tem no Auvo: `OS; 5338`, escopo "Mobilização dos equipamentos de Navegação", Solicitante, Supervisor e Coordenador. No Arrow ela aparece como "Auvo" sem número de OS e com "Escopo/descrição" vazio. Causas:

1. **Número da OS descartado.** A gravação usa apenas o `externalId` do Auvo (vazio nessa tarefa) e o fallback por texto só aceita `OS 5338`, não `OS; 5338`. O `parseOrientation` já extrai o número, mas esse valor não é usado ao gravar. Resultado: `order_number` nulo, tarefa não vincula à OS 5338 (que existe, com data 03/07 vinda do Omie) e o cartão mostra só "Auvo".
2. **Escopo perdido quando fica na linha seguinte.** Parser (TypeScript e função SQL) lê só `Chave; valor` na mesma linha. Aqui o texto vem embaixo de `Escopo;`. Hoje: **629 tarefas** com a chave `Escopo` presente e `scope_text` vazio.
3. **Campos já extraídos não são exibidos.** 2.028 tarefas têm Supervisor, 2.040 Solicitante e 1.600 Coordenador no banco, mas o detalhe da tarefa na agenda não mostra nenhum deles.

## O que será feito

### 1. Parser tolerante a valores multilinha
- Valor de uma chave passa a incluir as linhas seguintes até a próxima chave conhecida ou até blocos de rodapé como "Legenda do Relato".
- Vale para Escopo, Local e qualquer chave — mesma regra no parser da sincronização e na função SQL usada na reconciliação.

### 2. Número da OS recuperado do texto
- Ordem de precedência: `externalId` → `OS` da orientação (aceitando `;` e `:`) → padrão livre no texto.
- Tarefas de ausência (Férias/Folga/Sobreaviso) continuam sem OS, como hoje.

### 3. Reprocessamento das tarefas já sincronizadas
- Recalcular escopo, número da OS e demais campos das 2.731 tarefas a partir do texto já salvo (sem novas chamadas à API do Auvo).
- Rodar a reconciliação para vincular as tarefas às OSs correspondentes e propagar embarcação, equipe, coordenador, local e escopo.

### 4. Agenda e detalhe da tarefa
- Cartão da tarefa Auvo com OS recuperada passa a exibir o número da OS em vez de "Auvo".
- Detalhe da tarefa ganha Solicitante, Supervisor, Coordenador e a data informada no texto quando diferente da data agendada (caso desta tarefa: informada 19/08, agendada 20/08 — a agenda continua seguindo a data do Auvo).
- Quando não houver escopo estruturado, mostrar o texto de orientação como descrição, em vez de campo vazio.

## Detalhes técnicos

- `supabase/functions/auvo-sync/auvo.ts`: `parseOrientation` com captura multilinha e lista de chaves de corte; `extractOrderNumber` consultando o resultado do parse.
- `supabase/functions/auvo-sync/index.ts`: gravar `order_number` com a nova precedência.
- Migração: atualizar `parse_auvo_orientation` para valores multilinha; backfill de `auvo_tasks` (escopo + número da OS) e reconciliação com `service_orders`.
- `src/components/admin/calendar/AuvoTaskDetailsDialog.tsx` e `ServiceCalendar.tsx`: novos campos no detalhe e rótulo da OS no evento Auvo.
- Sem tabela nova, sem mudança de RLS e sem alterar a regra de que a agenda só mostra o que existe no Auvo.

## Validação

1. Tarefa 78667058 abre com OS 5338, escopo "Mobilização dos equipamentos de Navegação", Solicitante/Supervisor/Coordenador visíveis.
2. Contagem de tarefas com escopo vazio apesar da chave `Escopo` cai de 629 para perto de zero.
3. Nenhuma atividade nova aparece na agenda que não exista no Auvo.
