# Priorização ICE ao lado do RICE

## Situação atual

A priorização do roadmap hoje usa somente RICE: os chamados de suporte guardam `reach`, `impact`, `confidence`, `effort` e `rice_score`, estimados pela Marina na função `pm-rice-score` e exibidos na aba "Priorização RICE" do Dashboard de PM, no detalhe do chamado e como badge nos cards do Roadmap. Não existe nenhum campo de Facilidade nem score ICE no banco.

## O que muda

1. Cada item passa a ter também **Impacto**, **Confiança** e **Facilidade** (1 a 5) e um **score ICE = Impacto × Confiança × Facilidade** (0–125).
2. A Marina estima ICE na mesma passada em que calcula o RICE, e o super_admin pode ajustar qualquer um dos valores manualmente no detalhe do item (o score recalcula na hora).
3. A aba de priorização ganha um seletor de métrica: **ICE**, **RICE** ou **Ambas**. Ele define a coluna de ordenação da tabela e qual score aparece no badge dos cards do Roadmap. Preferência lembrada no navegador; padrão ICE.
4. Filtro por score mínimo e destaque de "Quick Win" (Impacto ≥ 4 e Facilidade ≥ 4 no modo ICE; Impacto ≥ 4 e Esforço ≤ 2 no modo RICE).
5. RICE continua intacto: mesmos campos, mesma justificativa, mesmo cálculo e mesmo botão "Calcular pendentes".

Nada é apagado nem migrado: itens antigos ficam sem ICE até serem calculados, e o botão "Calcular pendentes" preenche ambas as métricas.

## Detalhes técnicos

- **Migração** em `support_tickets`: colunas `ice_impact`, `ice_confidence`, `ice_ease` (smallint 1–5, validadas por trigger) e `ice_score` (numeric). Sem novas tabelas — RLS e grants existentes da tabela permanecem inalterados.
- `supabase/functions/pm-rice-score/index.ts`: o prompt passa a devolver também `ice_impact`, `ice_confidence`, `ice_ease` (com escala explicada em pt-BR, 5 = mais fácil); mesmo `clamp` 1–5; grava `ice_score = i * c * e`. Mantém todo o cálculo RICE atual e falha suave se a IA não devolver ICE.
- `src/hooks/usePMDashboard.ts`: novos campos em `PMTicket`; helper `computeIceScore`; `useUpdateTicketPM` recalcula `ice_score` quando um dos três fatores é editado.
- `src/pages/super-admin/PMDashboard.tsx`: `PriorityTab` recebe o seletor de métrica (ICE / RICE / Ambas), colunas condicionais e ordenação por score escolhido; no detalhe do chamado, bloco "ICE" com três células editáveis (Select 1–5) e score calculado, ao lado do bloco RICE existente.
- `src/pages/super-admin/RoadmapBoard.tsx`: badge do card mostra ICE, RICE ou ambos conforme a métrica ativa; ordenação de fallback dentro da coluna usa o score da métrica ativa (posição manual continua tendo prioridade).
- Métrica ativa em contexto leve/`localStorage` compartilhado entre a aba de priorização e o board, com `data-tour` nos novos controles para o walkthrough da Marina.
- Strings todas em pt-BR, seguindo os componentes shadcn já usados.
