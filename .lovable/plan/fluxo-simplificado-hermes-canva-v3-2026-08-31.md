# Fluxo simplificado Hermes + Canva (v3)

Ajustar a aba Design para o fluxo de 2 etapas: o Arrow monta um briefing completo em português (já com as imagens enviadas) e o motor faz upload dos assets, gera o design e exporta o PNG. Nada de transação de edição.

## 1. Formulário "Criar post"

- **Formato**: passa a ter três opções — Quadrado 1080x1080, Feed 1080x1350, Paisagem 1920x1080. (o valor antigo "story" continua aceito no backend para pedidos já salvos)
- **Título** (obrigatório), **Subtítulo** (opcional), **CTA** (opcional) — como hoje.
- **Cor / estilo predominante**: campo de texto livre (ex.: "azul-marinho corporativo"), substituindo a lista fixa de estilos.
- **Público-alvo**: campo de texto curto novo.
- **Logo da empresa**: upload de imagem. Por padrão usa a logo LECSOR já cadastrada na biblioteca; permite enviar outra.
- **Imagens de apoio**: upload de até 3 imagens, somadas às referências escolhidas na biblioteca de assets.
- Campos "Tema" e "Fundo" continuam, como contexto do briefing.

Uploads vão para o bucket privado de designs e entram no pedido como URLs assinadas (validade longa o suficiente para o motor baixar).

## 2. Briefing enviado ao motor

Prompt reescrito em português, no formato pedido:

```text
FORMATO: 1080x1350
COR/ESTILO: azul-marinho corporativo
TÍTULO: ...
SUBTÍTULO: ...
CTA: ...
LOGO: usar a logo enviada, posicionar no topo
PÚBLICO: ...
IMAGENS DE APOIO: <urls>
IDIOMA: português do Brasil
```

Regras que acompanham o briefing:
- Fazer `upload_asset_from_url` de cada imagem (logo e apoio) **antes** de `generate_design`.
- Proibido `start_editing_transaction` / `perform_editing_operations`; texto novo = nova geração.
- Todo o texto já vai dentro do `generate_design`, em português.
- Exportar cada design em PNG e responder em pares:
  `PREVIEW: <url_do_png>` / `DESIGNCANVA: <url_do_canva>`

O pedido de ajuste passa a ser sempre uma nova geração com o briefing original + a observação do usuário (nunca edição).

## 3. Exibição no Arrow (sem mudança estrutural)

O palco já mostra carrossel de variações com preview PNG, link "Abrir no Canva" e os botões Aprovar / Solicitar ajuste / Descartar. Só garantimos que o card destaque o preview e o link editável e que "Solicitar ajuste" reenvie como nova geração.

## Detalhes técnicos

- `supabase/functions/marina-chat/design.ts`: novo `DesignSize` (`quadrado` | `feed` | `paisagem`, aceitando `story` como legado), `style` vira texto livre, novos campos `audience` e `logo_url`; `buildPostPrompt` e `buildAdjustPrompt` reescritos no formato acima com as regras de `upload_asset_from_url`; `DESIGN_PROMPT` reforça idioma português e a proibição de edição.
- `supabase/functions/marina-chat/index.ts` (`design_create`, `design_adjust_canva`): aceita `logo_url`, `audience` e até 4 referências; guarda o briefing completo em `form`.
- `src/hooks/useMarinaDesigns.ts`: tipo `MarinaDesignForm` atualizado (formato, estilo livre, público, logo/apoio) e envio dos novos campos.
- `src/components/marina/design/DesignPostForm.tsx`: campos novos + upload nativo (input file sobreposto), com miniaturas e remoção; validação só do título.
- `src/components/marina/design/DesignWorkspace.tsx`: junta uploads e assets da biblioteca nas referências do pedido.
- Endpoint, auth, model e timeout (600s, já acima de 300s) permanecem como estão.
