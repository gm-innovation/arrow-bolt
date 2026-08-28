---
name: Palco de design da Marina (Canva)
description: Aba Design em /marina com Canva obrigatório, layout nativo em camadas, preview exportado do mesmo arquivo-mestre e aprovação humana
type: feature
---

- Aba **Design** em `/marina`, só para `marketing`, `commercial`, `director`, `super_admin`. Perfil do pedido vem do papel (marketing/comercial), sem dropdown livre.
- Layout duas colunas: conversa (~380px) + palco de preview, com abas **Atual** e **Aprovados**. No celular alterna Conversa ⇄ Preview.
- Sinal: o motor responde com uma linha no topo `DESIGNCANVA: <url>`. `src/lib/marina/designSignal.ts` lê/remove a linha (ela nunca aparece na conversa) e monta o embed `.../view?embed`.
- `marina-chat` grava o sinal em `ai_messages.metadata.design` e cria registro em `marina_design_approvals` (status `pendente` → `aprovado` | `ajuste_solicitado` | `descartado`), emitindo evento SSE `design`.
- **Canva obrigatório:** toda peça precisa de `canva_url` e de um preview exportado do mesmo arquivo Canva antes de poder ser aprovada. Falha do Canva deixa o pedido como pendente, preserva a fotografia-base e oferece retentativa; nunca aprova apenas um PNG local.
- **Nada de bastidores:** `stripBackstage`, `readCanvaOff`/`CANVAOFF:` e `friendlyFailReason` removem navegador/Chrome/token/MCP e traduzem a falha ("A conexão com o Canva precisa ser renovada").
- **Conversa não se perde:** falha, cancelamento ou prazo salvam o trecho já dito com `metadata.partial = true` e aviso "Interrompi aqui".
- Aprovar Canva = ação `design_approve`: exige `canva_url` + preview armazenado, pede nova exportação no formato escolhido, baixa e guarda no bucket privado `marina-designs` (`{user_id}/{design_id}.{ext}`); qualquer falha impede o status aprovado.
- `router.ts` → `isDesignRequest` força rota `externo` (o motor tem as ferramentas do Canva). `sanitize.ts` protege URLs para não apagar o link do Canva.
- **Resposta gravada em andamento:** a linha de `ai_messages` do assistente nasce com `metadata.streaming = true` e é atualizada por flush periódico; o registro em `marina_design_approvals` é criado ANTES da geração (palco mostra "Preparando a peça…").
- **Realismo é padrão:** sem estilo escolhido, a peça sai em fotografia ultrarrealista (proibido ilustração/cartoon/3D). Fotos anexadas são referências OBRIGATÓRIAS: equipamento fiel (modelo, cor, marca, proporções); sem foto, a Marina avisa que é composição e pede a foto real. Referências vão em `references` (URLs assinadas de `marina-designs/{user_id}/refs/`) e entram como blocos `image_url` no gateway de imagens.
- **Ações rápidas configuráveis:** `src/lib/marina/designTemplates.ts` (modelos prontos, formatos, tons, estilos, CTA, marca e montagem do prompt com prévia) + "Meus modelos" em `marina_design_templates` via `useMarinaDesignTemplates`.
- Perfil do motor enviado pelo segredo `HERMES_PROFILE` (hoje `super-admin`), para o Canva autenticado nesse perfil valer para o Arrow.

## Diretor de arte (subagente + skill)
- `supabase/functions/marina-chat/artDirector.ts`: `buildBrief` monta briefing estruturado (CONCEITO/CENA/TEXTOS/COR E TIPO/ENQUADRAMENTO/PROIBIDO) e `reviewArt` critica a peça gerada, permitindo uma única refação. Modelo `google/gemini-3.5-flash` no gateway do Arrow.
- `ART_DIRECTION`/`LECSOR_BRAND` são a fonte única da identidade: azul-marinho, sans industrial, fotografia ultrarrealista; proibido pixel/retrô/cartoon/vetor/3D e qualquer placeholder.
- **Arquivo-mestre em camadas:** o Arrow gera somente a fotografia-base sem texto/logo; o Canva monta fotografia, logo, textos, CTA, formas e faixas como elementos nativos separados. O palco mostra exclusivamente a exportação desse arquivo-mestre. Ajustes alteram o Canva existente e renovam o preview, evitando qualquer peça paralela ou achatada.
- Skill de biblioteca `direcao-de-arte-lecsor` em `ai_skills` (global, catálogo) para marketing/comercial/direção — vale no chat e no WhatsApp.
