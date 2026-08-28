# Quem faz o quê hoje (e por que está errando)

- **Coordenação / diretor de arte:** `google/gemini-3.5-flash` — monta o briefing e faz a crítica da peça (`marina-chat/artDirector.ts`).
- **Geração da imagem:** `google/gemini-3.1-flash-image` (Nano Banana 2) — desenha a peça inteira, **inclusive o texto** (`marina-chat/design.ts`).

O erro de fundo não é o modelo de imagem: **é o sistema inventando texto que você nunca pediu**. Hoje o diretor de arte é instruído a montar "hierarquia de texto" (título, subtítulo, CTA) mesmo quando o pedido não traz frase nenhuma — ele escreve as frases, e o modelo de imagem tenta desenhar essas frases longas em português e produz "CONNECTICÃO TEPTRONAL HA", "Essando uma srlink", "CLIQUE O CEVFTO A PRULIGOR!".

E as referências que você subiu (antena Starlink e capacete) não estão sendo usadas como devem: elas estão salvas como **Embarcações**, e o casamento de asset padrão com o tema do pedido é por categoria — então a antena real não entra de forma confiável como referência de fidelidade.

# O que muda

## 1. Texto só existe se você fornecer
Regra nova e dura, válida no chat, no WhatsApp e no palco de Design:

- Se o pedido **não traz frase**, a peça sai **sem texto nenhum** — só a fotografia composta, com área limpa reservada. Nada de título, subtítulo, CTA, endereço, site ou slogan inventado.
- Se o pedido **traz frases**, valem **exatamente aquelas palavras** — sem reescrever, traduzir, encurtar ou completar.
- A Marina, ao entregar peça sem texto, avisa em uma linha: "sem texto porque você não passou as frases — me diga o título/CTA que eu aplico".
- O diretor de arte perde a autonomia de redigir: ele só distribui no layout o que veio da pessoa.

## 2. Referências passam a ser a fonte da verdade do equipamento
- As imagens de referência (Starlink marítima, capacete/EPI, embarcação) entram sempre no pedido de imagem com regra de fidelidade total: mesmo modelo, formato, proporção e acabamento.
- O casamento de asset padrão deixa de depender só da categoria: passa a usar também o **nome e as etiquetas** do asset. Um asset chamado "starlink" entra quando o pedido fala de Starlink, esteja ele em qualquer categoria.
- Categoria evidentemente incoerente (capacete e antena em "Embarcações") gera aviso e sugestão de categoria correta ao salvar — sem bloquear.

## 3. Revisão que reprova de fato
- Coordenação/crítica sobem para `openai/gpt-5.5` (leitura de imagem e raciocínio melhores que o flash atual).
- A crítica ganha uma checagem objetiva: **toda palavra visível na peça precisa estar na lista de frases fornecida pela pessoa**. Palavra fora da lista (texto embaralhado, placeholder, slogan inventado, "GM Innovation") = reprovado.
- Hoje há uma refação; passa a ter até duas. Se ainda falhar, a peça é entregue **com aviso explícito** de que o texto saiu errado, em vez de sair como se estivesse certa.

## 4. Modelo de imagem escolhido pelo caso
- Peça **com** referências de equipamento (o caso normal aqui) → `google/gemini-3.1-flash-image`, que é o que respeita imagem de entrada.
- Peça **com frases fornecidas** e sem referência obrigatória → `openai/gpt-image-2`, o melhor do catálogo para texto legível.

## 5. Tela de Assets mais simples
Hoje o formulário de upload fica solto no topo e cada cartão vira um painel de edição — fica confuso.

- A aba passa a ser só a **biblioteca**: barra com busca, filtro de categoria e um botão **"Novo asset"** à direita.
- "Novo asset" abre um **modal** com: imagem (arrastar ou escolher, com prévia), nome, categoria, descrição curta, etiquetas e a opção "usar como referência padrão desta categoria". Salvar fecha o modal e o asset aparece na grade.
- O cartão fica limpo: miniatura, nome, categoria, selo "Padrão" quando for o caso, e um menu (⋯) com **Editar**, **Definir/remover padrão** e **Excluir**. Editar reabre o mesmo modal já preenchido — assim dá para arrumar o capacete e a Starlink que estão em "Embarcações".
- Selecionar para usar como referência continua no clique do cartão, com borda e contador do que está selecionado.


# Detalhes técnicos

- `supabase/functions/marina-chat/artDirector.ts`: `ART_DIRECTION` perde a instrução de criar copy; `ArtBrief` passa a ter `textos: string[]` preenchido **só** com frases extraídas literalmente do pedido (vazio = peça sem texto); `BRIEF_MODEL` → `openai/gpt-5.5`; `reviewArt` recebe `textos` e reprova palavra fora da lista.
- `supabase/functions/marina-chat/design.ts`: `generateMarinaImage` recebe o modelo e monta o corpo por família (`messages` + `modalities` para o Gemini de imagem; `prompt`/`size`/`quality` para `openai/gpt-image-2`); novo bloco de regra "sem texto quando a lista de frases estiver vazia" e reforço de `FIDELITY_RULES` sempre que houver referência.
- `supabase/functions/marina-chat/index.ts`: casamento de assets padrão por nome/etiqueta além de categoria; laço com até duas refações; `fail_reason` quando entrega com aviso; frase de aviso quando a peça sai sem texto.
- `src/components/marina/design/DesignAssetsPanel.tsx`: reescrito como grade + toolbar; novo `AssetFormDialog` (shadcn `Dialog` + `DropdownMenu`) para criar/editar, reaproveitando as mutations de `useMarinaDesignAssets.ts` (que ganha `update`); aviso de categoria incoerente dentro do modal.
- Sem mudança de schema.

# Fora do escopo
Editor de texto sobre a peça dentro do Arrow e refação automática da peça do print.
