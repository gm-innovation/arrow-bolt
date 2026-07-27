## Problema

O input do chat da Marina fica esmagado (mostrando só "Descr...") quando há um anexo. O chip do arquivo aparece dentro da mesma linha horizontal do Textarea e do botão Enviar.

**Causa:** em `AIChat.tsx` (linha 429), o layout é `flex gap-2 items-end` com três filhos lado a lado:
1. `<AIAttachmentUpload />` — que internamente é `flex-col` com os **chips dos anexos + botão clipe empilhados**
2. `<Textarea flex-1 />`
3. `<Button Send />`

Como os chips dos anexos vivem dentro do primeiro filho (`flex-col`), eles ocupam largura ao lado do textarea, comprimindo-o.

## Correção

Reestruturar a área de input para que os chips dos anexos fiquem em uma **linha superior de largura total**, e a linha inferior contenha apenas [clipe] [Textarea flex-1] [Send]:

```text
┌────────────────────────────────────────┐
│ [chip anexo1] [chip anexo2] ...        │  ← linha nova, w-full
├────────────────────────────────────────┤
│ 📎  [ Textarea ................... ]  ➤ │  ← linha compacta
└────────────────────────────────────────┘
```

### Mudanças

1. **`src/components/ai/AIAttachmentUpload.tsx`**
   - Separar a renderização em duas partes exportadas/props ou dividir em dois subcomponentes:
     - `AttachmentChips` (a lista de chips, renderizada acima)
     - `AttachmentButton` (só o botão de clipe/paperclip, para ficar ao lado do textarea)
   - Alternativa mais simples: manter um componente só, mas trocar o `flex-col` por um render em duas regiões controladas pelas props `variant` (`chips` | `button`). Preferir a divisão em dois componentes por ser mais legível.

2. **`src/components/ai/AIChat.tsx` (linhas 427–456)**
   - Wrap externo: `flex flex-col gap-2`.
   - Linha 1: `<AttachmentChips ... />` (só renderiza se `attachments.length > 0`).
   - Linha 2: `flex gap-2 items-end` com `<AttachmentButton />` + `<Textarea className="flex-1 ..." />` + `<Button Send />`.
   - Manter o placeholder condicional já existente.
   - Manter o hook `useMarinaAttachments` compartilhado entre os dois subcomponentes via as mesmas props (`attachments`, `onChange`, `max`).

3. Preservar todo o comportamento existente: drag-and-drop global no chat, limites (10 arquivos), remoção via X, estados de `uploading`, acessibilidade e tooltips.

Nenhuma outra tela usa `AIAttachmentUpload`, então a mudança é contida ao chat da Marina.

## Verificação

- Abrir `/admin/dashboard`, anexar 1 e depois 3 arquivos, confirmar que o textarea mantém largura total e o placeholder completo aparece.
- Testar drag-and-drop e remoção de chip.
- Enviar mensagem com anexo e sem anexo.