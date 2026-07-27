## Problema

Na screenshot, com um anexo presente, o placeholder longo ("Descreva o que quer que a Marina faça com o(s) anexo(s)...") quebra em duas linhas, mas o Textarea tem `min-h-[40px]` (≈1 linha), então o texto é cortado verticalmente e cria a sensação de campo "espremido". Há espaço horizontal suficiente — o problema é altura + distribuição vertical, não largura.

## Correção

Ajustes visuais mínimos em `src/components/ai/AIChat.tsx` (bloco do input, linhas ~427–456):

1. **Textarea:** aumentar altura mínima para acomodar 2 linhas confortavelmente e permitir crescer mais:
   - `min-h-[40px]` → `min-h-[56px]`
   - `max-h-[120px]` → `max-h-[160px]`
   - manter `resize-none flex-1`.

2. **Alinhamento da linha:** trocar `items-end` por `items-stretch` para que o botão de clipe e o botão Send acompanhem a altura do Textarea, ficando visualmente equilibrados em vez de colados à base.

3. **Botão do clipe (`AttachmentButton` em `AIAttachmentUpload.tsx`):** trocar `h-10 w-10` por `h-full w-10 self-stretch` (ou remover a altura fixa) para acompanhar o Textarea. O botão Send (`size="icon"`) recebe `className="h-full w-10 self-stretch"` no `AIChat.tsx`.

4. **Padding do container:** manter `p-3 border-t`; sem outras alterações.

Nenhuma alteração em lógica, hooks, drag-and-drop, limites de anexos ou envio.

## Verificação

- Sem anexos: placeholder curto cabe em 1 linha, campo mantém boa altura.
- Com 1+ anexos: placeholder longo cabe em 2 linhas sem cortar; clipe e Send acompanham a altura.
- Digitação longa cresce até `max-h-[160px]` e depois rola.