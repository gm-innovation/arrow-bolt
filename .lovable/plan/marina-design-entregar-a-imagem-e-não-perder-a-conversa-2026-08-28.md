# Marina Design: entregar a imagem e não perder a conversa

Dois problemas no mesmo pedido: (1) tudo o que a Marina falou durante o trabalho desapareceu da conversa; (2) ela ficou tentando abrir navegador/Chrome, tropeçou no token do Canva e terminou sem nenhuma imagem.

## O que muda

**1. Nada do que a Marina disser se perde**

Hoje a resposta só é gravada no fim do turno. Se o turno termina em erro, se a aba fecha ou se a conexão cai, o texto que estava aparecendo na tela é descartado — foi exatamente o que aconteceu.

- O texto parcial passa a ser gravado na conversa mesmo quando o turno falha, é cancelado ou estoura o tempo, marcado como incompleto ("interrompi aqui").
- A conversa volta a mostrar esse trecho ao recarregar a página, com o botão "tentar de novo" ao lado.

**2. A Marina para de tentar abrir navegador para fazer design**

- A instrução de design fica explícita: peça gráfica é feita pelas ferramentas do Canva, nunca abrindo navegador, Chrome ou clicando em telas.
- O relato de bastidores (tentativas, tokens, ferramentas) deixa de ir para a conversa como resposta: vira linha de status ("preparando a peça…", "reconectando o Canva…"), e a conversa fica com o resultado e a explicação em português.

**3. Token do Canva expirado deixa de virar silêncio**

- Quando o Canva recusa por credencial vencida/desconectada, a Marina diz isso com clareza e aponta a aba Conexões para reconectar — em vez de seguir tentando caminhos alternativos.

**4. Todo pedido de imagem termina com uma imagem**

Conforme sua escolha: avisa o problema do Canva **e** entrega uma prévia própria.

- Se o Canva não produzir peça, a Marina gera a imagem pelo gerador de imagens do próprio Arrow, guarda no armazenamento privado de designs e mostra no palco como "prévia gerada pela Marina" (editável depois no Canva quando a conexão voltar).
- Essa prévia entra na mesma fila de aprovação já existente (pendente → aprovado / ajuste / descartado), com a origem registrada (Canva ou Marina).
- O palco nunca mais fica vazio depois de um pedido: mostra a peça, a prévia própria ou o motivo, sempre com ação de repetir.

## Detalhes técnicos

- `supabase/functions/marina-chat/index.ts`: gravar `ai_messages` com o texto acumulado nos caminhos de erro/abort (metadata `partial: true`); mover o relato de bastidores para eventos `status`; após pedido de design sem sinal `DESIGNCANVA`, acionar o caminho de fallback.
- `supabase/functions/marina-chat/design.ts`: bloco de prompt reforçado (proibido navegador/Chrome; usar ferramentas do Canva), detecção de falha de credencial do Canva e nova função de fallback que gera a imagem via Lovable AI Gateway (`/v1/images/generations`, modelo `google/gemini-3.1-flash-image`, `stream: true`), grava no bucket `marina-designs` e cria o registro em `marina_design_approvals` com `source = 'marina'`.
- Migração: coluna `source` (`canva` | `marina`) em `marina_design_approvals`, default `canva`.
- `src/hooks/useMarina.ts`: preservar o rascunho na falha até a lista de mensagens recarregar (sem limpar o `draft` antes do refetch).
- `src/components/marina/design/DesignStage.tsx`: exibir prévia própria (imagem do Arrow) além do embed do Canva, com selo de origem e motivo quando o Canva falhou.
- `src/hooks/useMarinaDesigns.ts` / `ApprovedDesignsPanel.tsx`: mostrar a origem do design.

## Fora do escopo

Reconfiguração do Canva na VPS (OAuth do motor) e publicação automática em redes sociais.
