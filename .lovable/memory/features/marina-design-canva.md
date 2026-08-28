---
name: Palco de design da Marina (Canva)
description: Aba Design em /marina com conversa à esquerda e preview do Canva à direita, sinal DESIGNCANVA, prévia própria quando o Canva falha e aprovação com exportação guardada no Arrow
type: feature
---

- Aba **Design** em `/marina`, só para `marketing`, `commercial`, `director`, `super_admin`. Perfil do pedido vem do papel (marketing/comercial), sem dropdown livre.
- Layout duas colunas: conversa (~380px) + palco de preview, com abas **Atual** e **Aprovados**. No celular alterna Conversa ⇄ Preview.
- Sinal: o motor responde com uma linha no topo `DESIGNCANVA: <url>`. `src/lib/marina/designSignal.ts` lê/remove a linha (ela nunca aparece na conversa) e monta o embed `.../view?embed`.
- `marina-chat` grava o sinal em `ai_messages.metadata.design` e cria registro em `marina_design_approvals` (status `pendente` → `aprovado` | `ajuste_solicitado` | `descartado`), emitindo evento SSE `design`.
- **Nunca sai sem peça:** pedido de design tem prazo de 75 s no motor; se não vier `DESIGNCANVA`, a Marina gera prévia própria pelo gateway de imagens (`google/gemini-3.1-flash-image`, `data[0].b64_json`), guarda em `marina-designs` e registra com `source = 'marina'` + `fail_reason`. O palco mostra a imagem com selo "prévia da Marina"; aprovar não chama exportação do Canva.
- **Nada de bastidores:** `stripBackstage`, `readCanvaOff`/`CANVAOFF:` e `friendlyFailReason` removem navegador/Chrome/token/MCP e traduzem a falha ("A conexão com o Canva precisa ser renovada").
- **Conversa não se perde:** falha, cancelamento ou prazo salvam o trecho já dito com `metadata.partial = true` e aviso "Interrompi aqui".
- Aprovar Canva = ação `design_approve`: pede exportação ao motor, baixa o arquivo e guarda no bucket privado `marina-designs` (`{user_id}/{design_id}.{ext}`); listagem devolve URL assinada de 1h.
- `router.ts` → `isDesignRequest` força rota `externo` (o motor tem as ferramentas do Canva). `sanitize.ts` protege URLs para não apagar o link do Canva.
- **Resposta gravada em andamento:** a linha de `ai_messages` do assistente nasce com `metadata.streaming = true` e é atualizada por flush periódico; o registro em `marina_design_approvals` é criado ANTES da geração (palco mostra "Preparando a peça…").
- **Realismo é padrão:** sem estilo escolhido, a peça sai em fotografia ultrarrealista (proibido ilustração/cartoon/3D). Fotos anexadas são referências OBRIGATÓRIAS: equipamento fiel (modelo, cor, marca, proporções); sem foto, a Marina avisa que é composição e pede a foto real. Referências vão em `references` (URLs assinadas de `marina-designs/{user_id}/refs/`) e entram como blocos `image_url` no gateway de imagens.
- **Ações rápidas configuráveis:** `src/lib/marina/designTemplates.ts` (modelos prontos, formatos, tons, estilos, CTA, marca e montagem do prompt com prévia) + "Meus modelos" em `marina_design_templates` via `useMarinaDesignTemplates`.
- Perfil do motor enviado pelo segredo `HERMES_PROFILE` (hoje `super-admin`), para o Canva autenticado nesse perfil valer para o Arrow.

## Diretor de arte (subagente + skill)
- `supabase/functions/marina-chat/artDirector.ts`: `buildBrief` monta briefing estruturado (CONCEITO/CENA/TEXTOS/COR E TIPO/ENQUADRAMENTO/PROIBIDO) e `reviewArt` critica a peça gerada, permitindo uma única refação. Modelo `google/gemini-3.5-flash` no gateway do Arrow.
- `ART_DIRECTION`/`LECSOR_BRAND` são a fonte única da identidade: azul-marinho, sans industrial, fotografia ultrarrealista; proibido pixel/retrô/cartoon/vetor/3D e qualquer placeholder.
- Fluxo "os dois" em **uma peça só**: a arte é gerada e guardada ANTES de qualquer chamada ao Canva; a URL assinada dessa arte é enviada ao motor, que só cria no Canva um design usando essa mesma imagem como base (proibido outra foto/template). Palco mostra sempre `file_url`; o iframe do Canva foi removido (403 em design privado) e o Canva fica só como link. Falha só do Canva usa `canvaEditFailReason` e não invalida a peça.
- Skill de biblioteca `direcao-de-arte-lecsor` em `ai_skills` (global, catálogo) para marketing/comercial/direção — vale no chat e no WhatsApp.
