## Objetivo

O Dashboard PM contém um exemplo herdado de outro projeto ("Tempo médio de acesso por tripulante"), sugerindo controle de acesso portuário — algo que **não pertence ao Arrow**. O Arrow é uma plataforma operacional para OS, técnicos, RH/DP, SGQ, Comercial/CRM, Financeiro, Suprimentos e Corporativo. Vou revisar todos os textos placeholder/exemplos do Dashboard PM para refletir esse domínio real.

## O que muda (apenas cópia/UX, sem lógica)

Arquivo: `src/pages/super-admin/PMDashboard.tsx`

1. **Cabeçalho** — subtítulo passa a citar Arrow explicitamente:
   - De: *"Inteligência de produto, priorização e impacto — powered by IA"*
   - Para: *"Inteligência de produto do Arrow: priorização, descoberta e impacto — powered by Marina"*

2. **North Star vazio (linha 330)** — substituir o exemplo por métricas próprias do Arrow:
   - De: *`Nenhuma métrica cadastrada. Ex: "Tempo médio de acesso por tripulante".`*
   - Para: *`Nenhuma métrica cadastrada. Ex.: "OS concluídas no prazo", "Tempo médio de fechamento de OS", "Aderência documental SGQ", "Conformidade ASO ativa".`*

3. **Placeholder "Módulo impactado" (linha 206)** — alinhar aos módulos reais do Arrow:
   - De: *`ex.: RH, Comercial, SGQ...`*
   - Para: *`ex.: OS, RH/DP, Comercial/CRM, SGQ, Financeiro, Suprimentos, Corporativo, Marina (IA)`*

4. **Placeholder de Unidade da métrica (linha 400)** — exemplos condizentes:
   - De: *`min, %, ...`*
   - Para: *`%, dias, OS/mês, R$, ...`*

5. **OST vazio (linha 359)** — dar um exemplo do Arrow:
   - De: *"Árvore vazia. Comece pelo objetivo (Outcome)."*
   - Para: *"Árvore vazia. Comece por um Outcome do Arrow (ex.: 'Aumentar OS entregues no prazo' ou 'Reduzir retrabalho documental no SGQ')."*

6. **Fórmula/Notas da métrica** — adicionar `placeholder` orientando exemplos operacionais do Arrow (ex.: *"COUNT(service_orders WHERE completed_date <= due_date) / COUNT total no período"*).

7. **Changelog vazio (linha 664)** — texto passa a referenciar releases do Arrow em vez de "implementação" genérica.

## Fora de escopo

- Sem mudanças de schema, RLS, hooks ou Edge Functions.
- Sem alteração das abas, gráficos, RICE ou fluxos existentes — apenas textos de apoio/placeholders.
