# Design da Marina: cena em camadas de verdade + arte confiável

Hoje a peça sai de uma única chamada de geração no Canva: o Canva inventa a cena inteira como **uma** fotografia e só cria caixas de texto por cima. Daí os dois problemas relatados: a arte vem sem sentido (logo "LCSOR" deformado dentro da foto, placeholder "@reallygreatsite", cena genérica) e nada além do texto é editável.

O plano troca isso por uma peça montada em camadas, com fotografia real quando existir, e uma revisão automática antes de te mostrar qualquer coisa.

## 1. Plano de camadas antes de qualquer geração

O diretor de arte passa a devolver, além do briefing, um **plano de camadas** — normalmente 3 a 5:

```text
c1  fundo        céu + mar (horizonte, luz, clima)
c2  embarcação   casco/superestrutura, recorte com fundo transparente
c3  equipamento  antena Starlink marítima (foto real quando houver)
c4  pessoa       técnico de macacão coral com EPI, recorte transparente
c5  gráfico      faixa/bloco de cor da marca (elemento nativo do Canva)
```

Logo e textos nunca entram em camada de imagem: são elementos nativos do Canva.

## 2. Cada camada nasce separada, com foto real na frente

Para cada camada, nesta ordem:

1. Procura na biblioteca de Assets uma foto real que sirva (equipamento, embarcação, técnico), usando o que já está cadastrado.
2. Se não houver, gera por IA em fotografia ultrarrealista, com as fotos de referência do pedido, e o palco avisa que aquela camada é composição.
3. Camadas de recorte (embarcação, técnico, equipamento) são geradas isoladas sobre fundo branco liso e passam por remoção de fundo no próprio processo, virando PNG com transparência.

Sem foto real do equipamento citado, a Marina continua avisando na conversa que a peça é composição e pede a foto — como já é a regra da marca.

## 3. Montagem no Canva respeitando o limite da API

A API do Canva não insere elemento novo em design existente; só altera o que já existe. Então:

1. Uma única geração cria o arquivo já com **todos os textos literais do briefing** e com **um quadro de imagem por camada planejada** (fundo, embarcação, equipamento, pessoa) mais o logotipo.
2. Cada camada gerada/localizada é enviada ao Canva como asset e **substitui** o quadro correspondente — substituição de imagem existente é permitida pela API.
3. Resultado: no Canva você tem foto de fundo, embarcação, antena, técnico, faixa, logo e cada texto como elementos independentes, todos movíveis e substituíveis.

Se o Canva não aceitar a quantidade de quadros pedida, a peça é entregue com as camadas que couberam e o palco informa quais foram achatadas — nunca em silêncio.

## 4. Revisão automática antes de aparecer para você

Depois da montagem, a Marina lê os elementos do design e corrige sozinha:

- apaga qualquer placeholder (`@reallygreatsite`, `Anywhere Street`, `RSVP`, `Lorem`, arroba inventada);
- confere que cada texto é exatamente uma frase do briefing, sem copy inventada;
- verifica que nenhuma camada de imagem contém letras ou marca desenhada (fim do "LCSOR" torto no macacão);
- confere que as camadas planejadas existem como elementos distintos.

Até duas rodadas de correção automática. Só então a peça vai para o palco, com o preview exportado do próprio arquivo Canva. Se algo não puder ser corrigido, a peça aparece com o aviso do que ficou pendente.

## 5. Como isso aparece no palco

A trilha de etapas passa a ser: `briefing e plano de camadas` → `camadas (reais e geradas)` → `montagem no Canva` → `revisão automática` → `exportação e preview`. Cada camada mostra sua origem (foto real da biblioteca ou composição) e o tempo gasto, com retentativa por etapa.

## Detalhes técnicos

- `artDirector.ts`: `buildBrief` passa a devolver também `layers[]` (id, papel, prompt, precisa de transparência, termo de busca na biblioteca) em JSON validado; nada de texto livre.
- Nova tabela auxiliar não é necessária: as camadas ficam em `marina_design_approvals.metadata.layers` (origem, asset id, url assinada, status) e os arquivos em `marina-designs/{user_id}/{design_id}/layers/`.
- Busca de foto real: consulta em `marina_design_assets` por termo/etiqueta, priorizando equipamento e embarcação reais.
- Geração de camada: modelo de imagem do gateway com as referências como blocos de imagem; camadas de recorte pedem fundo branco liso.
- Remoção de fundo dentro da Edge Function: alpha por chave de branco com varredura a partir das bordas e suavização de borda, em TypeScript puro (sem dependência nativa).
- `design.ts`: `generateCanvaDesign` passa a pedir os quadros de imagem por camada; novas funções `uploadCanvaAsset`, `replaceCanvaImage` e `auditCanvaDesign` (leitura de elementos + correção de texto por edição, que é permitida).
- `index.ts`: `DESIGN_STEP_DEFINITIONS` ganha as etapas de camadas e revisão; `processCanvaDesign` executa camadas em paralelo (limite do semáforo do motor), mantém pulso por etapa e continua respondendo 202 com processamento em segundo plano.
- Frontend: `DesignStage.tsx` lista as camadas com origem e permite retentar uma camada isolada; `DesignWorkspace.tsx` mantém conversa livre e ajustes.
