## Objetivo
Permitir que o usuário envie **múltiplos anexos de uma vez** para a Marina e suporte **arrastar e soltar (drag & drop)** arquivos diretamente na área do chat.

## Estado atual
- `AIAttachmentUpload.tsx` já aceita múltiplos arquivos via `<input multiple>`, mas processa em série e não tem drop zone.
- Limite atual: 3 anexos por mensagem, 20MB por arquivo.
- Não há área de drop visual — usuário precisa clicar no botão de anexo.

## Mudanças

### 1. `AIAttachmentUpload.tsx`
- Confirmar `multiple` no input e processar todos os arquivos selecionados de uma vez (loop em `e.target.files`).
- Aumentar limite de anexos por mensagem de 3 para **até 10 arquivos** (mantendo 20MB cada).
- Validar total combinado (ex.: 60MB) para evitar payloads gigantes.

### 2. `AIChat.tsx` — Drop zone global no chat
- Adicionar handlers `onDragOver`, `onDragLeave`, `onDrop` no container do chat (`<div className="flex flex-col flex-1 min-h-0">`).
- Estado `isDragging` para exibir overlay visual ("Solte os arquivos aqui") quando arrastar sobre a área.
- No `onDrop`: extrair `e.dataTransfer.files`, chamar a mesma função de processamento do `AIAttachmentUpload` (extraída para um helper compartilhado ou exposta via ref/prop).
- Ignorar drop se `isLoading`.

### 3. Refatoração leve
- Extrair a função `processFiles(files: FileList)` do `AIAttachmentUpload` para um helper exportado (mesmo arquivo) para reuso pelo drop handler do `AIChat`.
- Manter validações (tipo, tamanho, limite total) centralizadas no helper.

## UX
- Overlay de drop: fundo semi-transparente com borda tracejada e texto "Solte para anexar à Marina".
- Chips dos anexos continuam sendo exibidos acima do textarea (comportamento atual).
- Toasts para erros: arquivo muito grande, tipo não suportado, limite excedido.

## Fora de escopo
- Preview inline de PDFs/docs.
- Upload em background enquanto o usuário digita (mantém upload síncrono ao enviar).
- Colar imagens do clipboard (pode virar próxima iteração se desejado).