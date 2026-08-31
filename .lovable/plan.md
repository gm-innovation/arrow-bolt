# Corrigir o scroll da coluna lateral da aba Design

## O problema

A coluna da esquerda da aba Design tem altura fixa (a mesma do palco) e hoje empilha quatro blocos: mensagens, botão "Gerar peça", formulário "Criar post" e o campo de mensagem. O formulário novo é alto, então ele empurra o conteúdo para fora da coluna: o histórico de mensagens fica comprimido no topo e o fim da coluna (o botão "Criar post no Canva" e o campo de mensagem) sai da área visível — e nada disso rola, como aparece na captura.

Causa confirmada na leitura do código: a lista de mensagens usa `flex-1 overflow-y-auto` sem `min-h-0`, então em um contêiner flex de altura fixa ela não encolhe; e o formulário é um irmão rígido, sem área de rolagem própria.

## Correção

- Dar `min-h-0` à área de mensagens para ela encolher de verdade e rolar dentro da coluna.
- Transformar o bloco "Criar post" em uma área com rolagem própria e altura máxima (cerca de metade da coluna), mantendo o campo de mensagem sempre fixo no rodapé.
- Tornar o formulário recolhível: cabeçalho "Criar post" clicável abre/fecha os campos, para quem só quer conversar ter a conversa inteira à vista.
- No celular, a mesma coluna passa a rolar por completo (mensagens + formulário), sem cortar o botão de gerar.

## Detalhes técnicos

- `src/components/marina/MarinaMessageList.tsx`: adicionar `min-h-0` aos dois contêineres `flex-1 overflow-y-auto` (estado vazio e lista).
- `src/components/marina/design/DesignWorkspace.tsx`: envolver `DesignPostForm` em um wrapper `shrink-0 max-h-[50%] overflow-y-auto`, mantendo `MarinaComposer` fora dele.
- `src/components/marina/design/DesignPostForm.tsx`: usar `Collapsible` do shadcn com o título "Criar post" como gatilho, aberto por padrão.

Apenas mudanças de layout e apresentação; nenhuma alteração na geração de peças, no motor ou nos dados.
