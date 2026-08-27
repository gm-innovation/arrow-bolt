---
name: Habilidades da Marina (biblioteca no banco)
description: Catálogo de skills em ai_skills/ai_skill_activations, criação por conversa com confirmação em linguagem simples, indicação por papel e aprendizado automático
type: feature
---

# Habilidades da Marina

- **Fonte da verdade é o banco**: `ai_skills` (name, slug, description, when_to_use, content markdown, category, status `catalogo|ativa|arquivada`, origin `builtin|user|auto`, `target_roles`, usage_hits, synced_at) + `ai_skill_activations` (por usuário, `state = active|dismissed`). Os arquivos `.md` em `/opt/data/skills/` no motor são apenas reflexo: gravados ao ativar, apagados quando ninguém mais tem a habilidade ativa.
- **10 habilidades prontas** entram como seed global (`company_id = null`, `origin = 'builtin'`) e não podem ser removidas, apenas desativadas.
- **Criação pelo chat** (`skills.ts` + `skillTurnResponse` em `marina-chat/index.ts`): `isSkillCreationIntent` desvia antes do `pickRoute`; antes de criar, `findSimilarSkills` reaproveita habilidade existente da biblioteca. O markdown **nunca** aparece ao usuário — só o `summary` em linguagem simples; o rascunho fica em `ai_conversations.context.pending_skill` até o "sim". "Não/ajusta" regenera com o feedback, quantas vezes precisar.
- **Sem aprovação de terceiros**: qualquer colaborador cria e ativa. Só Conexões e Execuções continuam restritas a usuário avançado (`is_ai_advanced_user`).
- **Reuso e indicação**: toda habilidade criada entra na biblioteca da empresa; ao ativar, o papel de quem ativou vai para `target_roles`, e colegas do mesmo papel a veem na aba Sugeridas (descarte é registrado como `state = dismissed`).
- **Aprendizado automático**: Edge Function `marina-skill-learner` (`verify_jwt = true`) varre `ai_agent_runs` dos últimos 14 dias, agrupa por usuário/papel e cadastra habilidades `origin = 'auto'`, `status = 'catalogo'` quando um pedido se repete 3+ vezes; deduplica por slug. Rodar por cron.
- O prompt da Marina lista as habilidades ativas da pessoa (nome + quando usar) — nunca caminhos de arquivo.
