# Documento renovado invalida o anterior

## Comportamento atual

A conformidade olha **todos** os documentos anexados. Como na ficha do Adriano existem dois ASOs (validade 06/04/2027 e 14/04/2026) e duas NR 34 (08/04/2027 e uma antiga), o documento antigo continua contando e gera alerta de "Vencido" mesmo já havendo a renovação válida.

## Regra desejada

Para cada tipo de documento, apenas a **versão mais recente** vale. As anteriores passam a ser histórico: não contam para o status do colaborador, não aparecem no painel de alertas e não entram nos filtros de documentação vencida. Vale para ASO e para todas as certificações (NRs, etc.).

## O que será feito

1. **Agrupar por documento**
   - ASO: um único grupo por colaborador.
   - Certificações: agrupadas pelo nome normalizado. Quando o nome traz um código de norma (NR 10, NR 33, NR 34, NR 35...), o código é a chave — assim "NR 34 - Condições e Meio Ambiente de Trab..." e "NR 34 - Trabalho na Indústria da Construção" são reconhecidas como a mesma certificação, independentemente do texto completo.
   - Se não houver código, usa-se o nome sem acentos/pontuação e em minúsculas.

2. **Escolher a versão vigente de cada grupo**: a de maior validade; sem validade, a de emissão/upload mais recente. As demais ficam marcadas como substituídas.

3. **Lista de colaboradores (`/hr/employees`)**: o badge agregado e os filtros "Documentação vencida / a vencer" passam a considerar somente as versões vigentes. O tooltip continua apontando qual documento causou o status.

4. **Ficha do colaborador**: os documentos substituídos passam a exibir um selo neutro **"Substituído"** (em vez de "Vencido") e ficam visualmente atenuados, preservando o histórico e o download. Opcionalmente ordenados após os vigentes.

5. **Painel de RH (`/hr/dashboard`)**: o card "Documentos com Vencimento Próximo" e o contador "Documentos Irregulares" ignoram versões substituídas — some o falso alerta de ASO/NR já renovada.

6. **Portal do colaborador**: mesma regra aplicada onde os documentos técnicos são listados, para não avisar sobre documento já renovado.

## Detalhes técnicos

- `src/lib/hr/documentStatus.ts`: novas funções `docGroupKey(doc)` (extrai código NR / normaliza nome) e `pickCurrentDocs(docs)` que devolve `{ current, superseded }`; `aggregateDocCompliance` passa a receber apenas os vigentes. Nova entrada de status `superseded` nos metadados de badge.
- `src/pages/hr/Employees.tsx`: aplicar `pickCurrentDocs` antes de `aggregateDocCompliance` na montagem das linhas.
- `src/components/hr/EmployeeDetailSheet.tsx`: marcar cada item da lista com a flag de substituído e renderizar o selo neutro.
- `src/pages/hr/Dashboard.tsx`: filtrar por vigentes antes de montar a lista de alertas (ASO por técnico + certificações agrupadas).
- Sem alteração de banco, RLS ou de dados existentes — a regra é de leitura/apresentação.

## Validação

- Ficha do Adriano: ASO 06/04/2027 "Válido", ASO 14/04/2026 "Substituído"; NR 34 mais nova "Válido", a antiga "Substituído".
- Lista de colaboradores: Adriano deixa de aparecer no filtro "Documentação vencida".
- Colaborador com NR realmente vencida e sem renovação continua sinalizado como "Vencido" na lista e no painel.
