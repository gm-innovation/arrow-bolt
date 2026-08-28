# Premissas de marca + Biblioteca de Assets da Marina

## Problema
As peças saem com informações erradas de marca e de operação: assinatura "Lecsor Technology / GM Innovation", embarcações genéricas, Starlink residencial e técnicos sem o uniforme/EPI real. E não existe um lugar único para guardar as fotos de referência que usamos sempre.

## Parte 1 — Premissas fixas da LECSOR

Passam a valer para chat, WhatsApp, prévia própria e Canva (a direção de arte é a fonte única):

- **Nome:** apenas **Lecsor Technology**. Nunca "GM Innovation", nunca as duas juntas.
- **Embarcações:** o padrão é **embarcação de apoio offshore** (PSV/OSV, casco de trabalho, guindaste, deck de carga). Nunca lancha, veleiro, iate, navio de cruzeiro ou cargueiro de contêiner.
- **Starlink:** sempre a linha **marítima** (antena Starlink Maritime, base robusta para instalação em embarcação). Proibido o kit residencial.
- **Técnicos:** **macacão coral** com a logo Lecsor no peito e nas costas, e **EPI completo**: capacete, óculos de proteção, luvas, macacão e bota de segurança. Em trabalho em altura, também **cinto de segurança com talabarte**. Proibido técnico sem EPI, de camiseta, ou com uniforme de outra cor.

Onde entra:
- `LECSOR_BRAND` / `ART_DIRECTION` em `supabase/functions/marina-chat/artDirector.ts` — briefing e revisão passam a reprovar a peça que violar qualquer premissa (uniforme errado, embarcação errada, antena residencial, assinatura errada).
- `DESIGN_PROMPT` em `supabase/functions/marina-chat/design.ts` e prompt da Marina em `marina-chat/index.ts` (linha de identidade).
- Skill de biblioteca `direcao-de-arte-lecsor` em `ai_skills` — conteúdo atualizado para valer também no WhatsApp.
- Textos de identidade em `whatsapp-in` e nos documentos do projeto (`AGENTS.md`, `docs/arrow-knowledge.md`) ajustados para "Lecsor Technology".

## Parte 2 — Área de Assets

Nova aba **Assets** dentro da área de Design em `/marina`, com biblioteca compartilhada da empresa.

- **Categorias:** Embarcações, Equipamentos, Equipe/EPI, Marca (logo), Ambientes/Bordo, Clientes, Outros.
- **Upload** de imagens (arrastar ou botão) com nome, categoria, descrição curta e etiquetas.
- **Marcar como padrão da categoria:** os assets padrão entram automaticamente como referência obrigatória quando o pedido menciona o tema (ex.: pediu peça com técnico → entram as fotos padrão de Equipe/EPI; mencionou Starlink → entra a antena marítima).
- **Usar como referência:** selecionar assets direto nas Ações Rápidas, sem precisar subir a mesma foto de novo.
- **Visibilidade:** todos que têm acesso ao Design veem a biblioteca; quem pode subir/editar/excluir é marketing, comercial, diretoria e super admin.

## Detalhes técnicos

- Tabela `public.marina_design_assets`: `id`, `company_id`, `created_by`, `category`, `name`, `description`, `tags text[]`, `storage_path`, `is_default boolean`, `created_at`. Com `GRANT`, RLS habilitado e políticas por `company_id` (leitura para papéis do Design, escrita para marketing/comercial/director/super_admin).
- Arquivos no bucket privado existente `marina-designs`, prefixo `assets/{company_id}/{asset_id}.{ext}`; listagem devolve URL assinada de 1 h (mesmo padrão dos designs).
- Novo hook `src/hooks/useMarinaDesignAssets.ts` (listar, subir, editar, excluir, alternar padrão) e componente `src/components/marina/design/DesignAssetsPanel.tsx`; aba adicionada em `DesignWorkspace.tsx`.
- `DesignQuickActions.tsx`: seletor de assets ao lado do upload de referências; as URLs assinadas escolhidas entram no mesmo array `referencias` já usado hoje.
- `marina-chat`: ao montar o briefing, os assets padrão relevantes ao pedido são anexados às `references` enviadas ao diretor de arte e ao gerador de imagem.
- Memória do projeto atualizada com as premissas de marca e a biblioteca de assets.

## Fora do escopo
Publicação automática em redes sociais e edição de imagem dentro do Arrow.
