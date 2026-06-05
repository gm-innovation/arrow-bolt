# Fix: sidebar do desktop não rola

## Causa
Em `src/components/DashboardLayout.tsx` (linha ~381), o container do sidebar desktop é apenas:

```
<div class="relative flex-shrink-0 ... w-64">
  <div> header </div>
  <div class="flex-1 overflow-y-auto"> menu </div>
  <div> logout </div>
</div>
```

O pai não é `flex flex-col` e não tem altura total, então `flex-1` não restringe a área do menu — o conteúdo cresce verticalmente e o `overflow-y-auto` nunca dispara. Em telas menores (ou com muitos itens, como agora com Qualidade + Calibração + Provedores), os últimos itens ficam inacessíveis.

## Correção
Ajustar apenas o container do sidebar desktop para virar coluna flex de altura total:

- Adicionar `flex flex-col h-full` ao `<div>` da linha 381-384.
- Manter `flex-1 overflow-y-auto` no bloco do menu (linha 405) — agora vai funcionar porque o pai constrange a altura.
- Header e rodapé (logout) continuam como `flex-shrink-0` natural (já são, por estarem fora do `flex-1`).

Nada muda no mobile (Sheet já tem seu próprio scroll) nem no conteúdo principal.

## Arquivos
- `src/components/DashboardLayout.tsx` — uma edição pontual no `className` do container do sidebar desktop.
