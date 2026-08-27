---
name: Palco de design da Marina (Canva)
description: Aba Design em /marina com conversa à esquerda e preview do Canva à direita, sinal DESIGNCANVA, aprovação com exportação guardada no Arrow
type: feature
---

- Aba **Design** em `/marina`, só para `marketing`, `commercial`, `director`, `super_admin`. Perfil do pedido vem do papel (marketing/comercial), sem dropdown livre.
- Layout duas colunas: conversa (~380px) + palco de preview, com abas **Atual** e **Aprovados**. No celular alterna Conversa ⇄ Preview.
- Sinal: o motor responde com uma linha no topo `DESIGNCANVA: <url>`. `src/lib/marina/designSignal.ts` lê/remove a linha (ela nunca aparece na conversa) e monta o embed `.../view?embed`.
- `marina-chat` grava o sinal em `ai_messages.metadata.design` e cria registro em `marina_design_approvals` (status `pendente` → `aprovado` | `ajuste_solicitado` | `descartado`), emitindo evento SSE `design`.
- Aprovar = ação `design_approve`: pede exportação ao motor, baixa o arquivo e guarda no bucket privado `marina-designs` (`{user_id}/{design_id}.{ext}`); listagem devolve URL assinada de 1h.
- `router.ts` → `isDesignRequest` força rota `externo` (o motor tem as ferramentas do Canva). `sanitize.ts` protege URLs para não apagar o link do Canva.
