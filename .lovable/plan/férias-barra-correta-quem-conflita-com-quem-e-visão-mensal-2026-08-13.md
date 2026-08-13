# Férias: barra correta, quem conflita com quem e visão mensal

Três ajustes na tela `/hr/vacations`, aba Programação.

## 1. Férias que atravessam o mês não devem parecer 60 dias

Hoje a grade marca o mês de início e o mês de fim com a mesma etiqueta "30d", como se fossem dois gozos.
Passa a existir uma única barra por programação, contínua, começando no mês de início e terminando no mês de fim, com a quantidade de dias escrita uma só vez. Meses intermediários ficam pintados sem repetir o número. Quando o gozo começa no ano anterior ou termina no ano seguinte, a barra aparece cortada na borda, com indicação de continuação.

## 2. Mostrar quem está conflitando com quem

O conflito hoje só diz "3 técnicos em férias sobrepostas (limite 1)", sem nomes nem datas.
O detalhe do conflito passa a listar, para cada conflito:
- os colegas envolvidos (nome e cargo),
- o período de gozo de cada um (data início → data fim) e a quantidade de dias,
- os dias exatos de sobreposição com a programação em questão.

Esse detalhe aparece nos três lugares: no popover do badge de conflito na aba Solicitações, no tooltip/clique da barra na grade, e no novo painel mensal. Os envolvidos são calculados a partir das próprias programações carregadas (mesma empresa, mesmo intervalo de datas), sem depender do texto gravado no banco.

## 3. Visão mensal do calendário

A aba Programação ganha alternância **Ano / Mês**:
- **Ano**: grade atual (colaborador × 12 meses), já com a barra corrigida.
- **Mês**: navegação mês a mês, com uma linha por colaborador e uma coluna por dia do mês. Cada gozo aparece como faixa nos dias exatos, com fins de semana e feriados da empresa sombreados. Um cabeçalho por dia mostra quantos colaboradores (e quantos técnicos) estão de férias naquele dia, destacando em vermelho os dias que estouram os limites configurados nas Regras.
- Clicar em uma faixa abre o detalhe do gozo com os conflitos e a lista de quem está sobreposto naqueles dias.
- Filtros de ano/mês, cargo e "apenas com conflito" continuam valendo nas duas visões.

## Detalhes técnicos

- `VacationYearGrid.tsx`: substituir o mapa mês→células por cálculo de intervalo (mês inicial, mês final, colspan) e renderizar uma célula única com `colSpan`; rótulo de dias apenas na primeira célula.
- Novo `VacationMonthGrid.tsx` (dia × colaborador) e um seletor de modo em `Vacations.tsx`; datas sempre com `parseISO`/`new Date(y, m-1, d)`.
- Novo utilitário `src/lib/hr/vacationOverlaps.ts`: recebe a lista de `VacationRequest` e devolve, por programação, os pares sobrepostos com dias de interseção; usado por `ConflictBadge`, pela grade anual e pela mensal.
- `ConflictBadge.tsx` passa a receber os envolvidos calculados e renderiza a lista de nomes/períodos abaixo da descrição do conflito.
- Feriados vêm de `company_holidays` (somente leitura) para o sombreado da visão mensal.
- Nenhuma mudança de schema, política ou função no banco; o texto atual do conflito é mantido e apenas complementado na interface.
