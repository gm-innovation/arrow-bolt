# Por que o RH só mostra "A vencer" mesmo com certificação vencida

## Diagnóstico (confirmado)

O CARLOS AUGUSTO KREISCHER tem, no banco:

- ASO válido até **08/09/2026** (a vencer em ~29 dias)
- Certificação **NR 34 vencida em 28/07/2026**

O que aparece hoje:

1. Na lista `/hr/employees`, a coluna de status olha **apenas o ASO** (`aso_valid_until`). Como o ASO só está "a vencer", o badge fica "A vencer" e a NR 34 vencida não influencia nada. (A data 17/04/2026 ao lado é a coluna "Desde", não validade.)
2. Na ficha do colaborador, a lista de documentos técnicos imprime só o texto "Certificação • Validade: 28/07/2026", sem badge de situação — por isso o vencimento passa despercebido. Outra tela (documentos do técnico) já mostra "Vencido" corretamente, o que explica a divergência entre as telas.
3. O card do painel de RH chama-se "ASOs com Vencimento Próximo" e, por definição, lista só ASOs — certificações vencidas não entram ali.

Ou seja: não é erro de cálculo de data; é falta de agregação das certificações no indicador do RH.

## O que será feito

1. **Coluna de conformidade na lista de colaboradores**: passar a considerar ASO **e** certificações. O badge mostra a pior situação encontrada (Vencido > A vencer > Válido), com tooltip indicando qual documento causou o status (ex.: "NR 34 vencida em 28/07/2026").
2. **Badges na ficha do colaborador**: cada documento técnico (ASO e certificações) passa a exibir Vencido / A vencer em Xd / Válido até dd/mm/aaaa, igual ao padrão já usado nas outras telas.
3. **Painel de RH**: renomear o card para "Documentos com Vencimento Próximo" e incluir certificações vencidas/a vencer, mantendo os ASOs, com rótulo do documento em cada linha.
4. **Ordenação/filtro**: no filtro de status da lista, permitir filtrar por "Documentação vencida" e "A vencer", para o RH agir direto.

Nenhuma regra de negócio de validade é alterada; datas continuam tratadas com construtores locais (sem deslocamento de fuso).

## Detalhes técnicos

- `src/pages/hr/Employees.tsx`: buscar `technician_documents` (tipo, nome, `expiry_date`) dos técnicos da empresa junto da query atual e derivar o status agregado; substituir `getAsoStatus` por um helper de conformidade reutilizável.
- Novo helper compartilhado (ex.: `src/lib/hr/documentStatus.ts`) com o cálculo Vencido/A vencer/Válido usando `parseISO`, consumido pela lista, pela ficha e pelo painel.
- `src/components/hr/EmployeeDetailSheet.tsx`: aplicar o badge na linha de documentos técnicos (mesma lista que hoje só imprime "Validade: ...").
- `src/pages/hr/Dashboard.tsx`: ampliar a consulta do card para incluir certificações.
- Somente frontend; sem migração de banco e sem mudança de RLS.

## Validação

- Conferir que o CARLOS aparece como "Vencido" na lista (por causa da NR 34) e que a ficha mostra o badge vermelho na NR 34.
- Conferir que o GABRIEL (ASO 10/08/2026) continua sinalizado.
- Conferir que colaborador sem documentos segue exibindo "—".
