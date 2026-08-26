---
name: Copiloto Marina com motor externo (Hermes)
description: Tela /marina estilo ChatGPT, motor Hermes na VPS oculto sob a marca Marina, usuários avançados com skills e conexões
type: feature
---

# Copiloto Marina (tela cheia) + motor externo

- Para o colaborador existe **apenas a Marina**. O Hermes (harness na VPS) é motor: nome, modelo e ferramentas nunca aparecem. `marina-chat/sanitize.ts` troca qualquer menção (hermes/gemini/gpt/claude/openrouter) por "Marina", remove nomes de ferramentas e UUIDs.
- Tela `/marina` e `/marina/:threadId` (dentro do `CorpLayoutRoute`, todos os papéis), item "Marina" no topo do menu de todas as áreas. Histórico em `ai_conversations`/`ai_messages` com `context.channel = 'marina_web'` — o filtro da lista de threads exige esse canal para não puxar conversas do balão/WhatsApp.
- Edge Function `marina-chat` (`verify_jwt = true`) faz o roteamento por tarefa (`router.ts`): sinais internos → `ai-assistant` (dados do Arrow com o token do usuário); sinais externos → motor; ambos → apura no Arrow e passa o resumo ao motor. Responde em SSE (`meta`/`status`/`delta`/`done`).
- Provedor `hermes` em `_shared/llm.ts` usa `HERMES_BASE_URL` + `HERMES_API_KEY`; `hermes.ts` tenta `Authorization: Bearer`, `X-API-Key` e `Authorization: <key>` antes de desistir. Motor fora do ar = resposta com o que o Arrow tem, dizendo o que faltou.
- **Usuário avançado**: tabela `ai_advanced_users` + função `is_ai_advanced_user` (super admin já é avançado por padrão). Só avançado vê as abas Habilidades, Conexões e Execuções e só ele pode terminal/arquivos/código/skills. Checagem é server-side.
- Skills são arquivos `.md` em `/opt/data/skills/` na VPS, criados/editados pelo próprio motor a pedido da função; todo salvamento/remoção grava `ai_skill_audit`. Execuções registradas em `ai_agent_runs`.
- Conexões externas reaproveitam `ai_external_connectors`; credencial sempre em segredo do backend.
- O endpoint hoje é HTTP em IP puro — recomendado migrar para HTTPS com domínio próprio.
