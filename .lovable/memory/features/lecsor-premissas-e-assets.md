---
name: Premissas de marca da Lecsor e biblioteca de assets
description: Nome só "Lecsor Technology", embarcação de apoio offshore, Starlink marítima, macacão coral com EPI completo; contexto institucional em company.ts e biblioteca de assets em marina_design_assets
type: feature
---

## Premissas invioláveis (texto e imagem)
- Nome da empresa: **apenas "Lecsor Technology"**. Nunca "GM Innovation" nem variações combinadas.
- Embarcações: sempre de **apoio offshore** (PSV/OSV, casco de trabalho, guindaste, deck de carga). Proibido lancha, veleiro, iate, cruzeiro, porta-contêineres.
- Starlink: sempre a linha **marítima** (Starlink Maritime). Proibido kit residencial.
- Técnicos: **macacão coral** com logo Lecsor no peito e nas costas + EPI completo (capacete, óculos, luvas, macacão, bota); cinto com talabarte em trabalho em altura.

## Contexto institucional
- Fonte única: `supabase/functions/marina-chat/company.ts` (`LECSOR_CONTEXT`, `LECSOR_PREMISSAS`), usada pelo prompt da Marina, por `artDirector.ts` (`ART_DIRECTION`) e por `design.ts` (`DESIGN_PROMPT`).
- Espelho legível: `docs/lecsor-contexto.md` (base: lecsor.com.br). Skill global `contexto-lecsor` em `ai_skills` faz valer no WhatsApp.
- `reviewArt` reprova a peça que violar qualquer premissa.

## Biblioteca de assets
- Tabela `marina_design_assets` (categoria, nome, descrição, tags, storage_path, is_default); leitura por empresa, escrita para marketing/comercial/director/super_admin.
- Arquivos no bucket privado `marina-designs` em `{user_id}/assets/...`; URLs assinadas de 1 h servidas pelas ações `assets`, `asset_save`, `asset_delete` do `marina-chat`.
- Aba **Assets** no palco de design (`DesignAssetsPanel`): categorias Embarcações, Equipamentos, Equipe/EPI, Marca, Ambientes, Clientes, Outros; seleção envia os assets como referência do próximo pedido.
- Assets marcados como **padrão** entram automaticamente como referência quando o pedido cita o tema (`ASSET_HINTS` em `marina-chat/index.ts`).
