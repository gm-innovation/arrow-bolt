---
name: Arquitetura agêntica da Marina
description: Orquestrador + especialistas, camada de leitura universal (catálogo, query_entity, ranking) e guardrails de redação
type: feature
---

# Marina: orquestrador + especialistas

- `router.ts` classifica o domínio e planeja tarefas (`planTasks`); pode gerar mais de uma tarefa para o mesmo especialista.
- `specialists.ts` roda subagentes de LEITURA em paralelo (Gemini flash-lite), 8 passos e 40s por subagente. Regras fixas: é proibido responder sem consultar (nudge automático), nada de UUID, nada de nome de ferramenta, nada de perguntar status técnico ao usuário.
- `universal.ts` é a camada de acesso universal:
  - catálogo via RPC `ai_catalog_entities` **paginado de 1000 em 1000** (o Data API corta em 1000 linhas; sem paginação metade das entidades some);
  - dicionário `SYNONYMS` pt-BR → entidade, com stemming de plural (“solicitações” → `corp_requests`);
  - `query_entity` com filtros, janela de data, `count_only`, `group_by` (ranking agregado em memória, top 20) e devolução de `campos_validos` / `valores_existentes` quando o filtro erra;
  - ids viram nomes (`resolvePeople`, `labelGroupValues`) e timestamps saem formatados em Brasília;
  - `explain_notification` casa a notificação por similaridade de texto e varre entidades de fallback pelo `reference_id`, distinguindo “não existe” de “fora do seu acesso”.
- `guardrails.ts`: bloqueia UUID na resposta, especulação sem consulta e bastidores; nome de ferramenta é **limpo** (scrub), não descarta a resposta; texto mutilado no começo vira resposta honesta.

Vocabulário de negócio fixado nos prompts: “em atraso” = data prevista anterior a hoje + status não concluído/cancelado; “aguardando aprovação” = status pending/waiting/aguard.
