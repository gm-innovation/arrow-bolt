# Quem faz o quê hoje (e por que está errando)

- **Coordenação / diretor de arte:** `google/gemini-3.5-flash` — monta o briefing e faz a crítica da peça (`marina-chat/artDirector.ts`).
- **Geração da imagem:** `google/gemini-3.1-flash-image` (Nano Banana 2) — desenha a peça inteira, **inclusive o texto** (`marina-chat/design.ts`).

O texto embaralhado da peça ("CONNECTICÃO TEPTRONAL HA", "Essando uma srlink") é exatamente o ponto fraco desse modelo rápido: ele não escreve frase longa em português. E a crítica atual passa a peça porque o revisor é um modelo de texto barato olhando uma imagem — ele não percebe palavra inventada.

Um detalhe da biblioteca também ajuda a errar: na aba Assets, o asset "starlink" é o **kit residencial** e está marcado como padrão em "Embarcações", junto de um capacete também em "Embarcações". Como asset padrão entra automaticamente como referência, a peça herda a antena errada.

# O que muda

## 1. Modelo de geração mais forte em tipografia
Trocar o gerador para `openai/gpt-image-2` (o melhor do catálogo para texto legível), com `google/gemini-3.1-flash-image` como reserva quando o pedido tiver foto de referência de equipamento (fidelidade a imagem de entrada é a força do Gemini). Ou seja: peça com muito texto → GPT-Image-2; peça que precisa reproduzir equipamento anexado → Gemini de imagem, e o texto entra em camada (item 2).

## 2. Texto nunca mais é "desenhado" à toa
O briefing passa a listar as frases exatas, e o pedido de imagem instrui a peça a nascer com **pouco ou nenhum texto** (fundo fotográfico + área limpa). O título/subtítulo/CTA são escritos como camada real na peça, com as palavras que a pessoa passou — sem chance de palavra inventada.

## 3. Revisão que reprova de fato
- Coordenação/crítica sobem para `openai/gpt-5.5` (raciocínio e leitura de imagem melhores que o flash atual).
- A crítica passa a ter checagem obrigatória palavra por palavra: toda palavra visível na peça precisa existir na lista aprovada do briefing. Qualquer texto embaralhado, placeholder ou assinatura errada = reprovado.
- Hoje há **uma** refação; passa a ter até **duas**, e se ainda falhar a peça é entregue com aviso claro de que o texto precisa de ajuste, em vez de sair como se estivesse certa.

## 4. Assets coerentes com as premissas
- Ao salvar/marcar como padrão, o asset é conferido contra as premissas (Starlink marítima, embarcação de apoio offshore, macacão coral com EPI) e a categoria escolhida; incoerência gera aviso na hora ("essa parece a antena residencial", "capacete não é Embarcações").
- Assets padrão só entram como referência quando a categoria bate com o tema do pedido.

# Detalhes técnicos

- `supabase/functions/marina-chat/design.ts`: `generateMarinaImage` passa a receber o modelo, com corpo próprio por família (`prompt`/`size`/`quality`/`stream` para `openai/gpt-image-2`; `messages` + `modalities` para o Gemini de imagem), seleção por presença de referências, e regra de "área limpa para texto".
- `supabase/functions/marina-chat/artDirector.ts`: `BRIEF_MODEL` → `openai/gpt-5.5`; `ArtBrief` ganha `textos: string[]` (palavras aprovadas); `reviewArt` recebe essa lista e reprova palavra fora dela.
- `supabase/functions/marina-chat/index.ts`: laço de geração com até duas refações, gravação de `fail_reason` quando entrega com aviso, e filtro de assets padrão por categoria.
- `src/components/marina/design/DesignAssetsPanel.tsx` + ação `asset_save`: validação de coerência do asset e aviso na UI.
- Sem mudança de schema.

# Fora do escopo
Refazer a peça do print automaticamente e edição manual de texto na peça dentro do Arrow.
