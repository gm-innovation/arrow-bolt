---
name: Palco de design da Marina (Canva)
description: Aba Design em /marina com conversa à esquerda e preview do Canva à direita, sinal DESIGNCANVA, prévia própria quando o Canva falha e aprovação com exportação guardada no Arrow
type: feature
---

- Aba **Design** em `/marina`, só para `marketing`, `commercial`, `director`, `super_admin`. Perfil do pedido vem do papel (marketing/comercial), sem dropdown livre.
- Layout duas colunas: conversa (~380px) + palco de preview, com abas **Atual** e **Aprovados**. No celular alterna Conversa ⇄ Preview.
- Sinal: o motor responde com uma linha no topo `DESIGNCANVA: <url>`. `src/lib/marina/designSignal.ts` lê/remove a linha (ela nunca aparece na conversa) e monta o embed `.../view?embed`.
- `marina-chat` grava o sinal em `ai_messages.metadata.design` e cria registro em `marina_design_approvals` (status `pendente` → `aprovado` | `ajuste_solicitado` | `descartado`), emitindo evento SSE `design`.
- **Nunca sai sem peça:** pedido de design tem prazo de 150 s no motor; se não vier `DESIGNCANVA`, a Marina gera prévia própria pelo gateway de imagens (`google/gemini-3.1-flash-image`, `data[0].b64_json`), guarda em `marina-designs` e registra com `source = 'marina'` + `fail_reason`. O palco mostra a imagem com selo "prévia da Marina"; aprovar não chama exportação do Canva.
- **Nada de bastidores:** `stripBackstage`, `readCanvaOff`/`CANVAOFF:` e `friendlyFailReason` removem navegador/Chrome/token/MCP e traduzem a falha ("A conexão com o Canva precisa ser renovada").
- **Conversa não se perde:** falha, cancelamento ou prazo salvam o trecho já dito com `metadata.partial = true` e aviso "Interrompi aqui".
- Aprovar Canva = ação `design_approve`: pede exportação ao motor, baixa o arquivo e guarda no bucket privado `marina-designs` (`{user_id}/{design_id}.{ext}`); listagem devolve URL assinada de 1h.
- `router.ts` → `isDesignRequest` força rota `externo` (o motor tem as ferramentas do Canva). `sanitize.ts` protege URLs para não apagar o link do Canva.
