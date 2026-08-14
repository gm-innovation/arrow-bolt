# Remover botão "Expandir todos" da tela de Documentos de Colaboradores

## Contexto
O botão "Expandir todos / Recolher todos" em `src/components/hr/sharing/EmployeeDocumentsView.tsx` (linhas 123–128) é considerado desnecessário. Cada colaborador já pode ser expandido individualmente clicando no acordeão.

## Alteração
Remover o bloco condicional do botão (linhas 123–128), deixando apenas o botão "Criar pacote" no `<div className="flex gap-2">`. O `Accordion` com `type="multiple"` continua funcionando normalmente com expansão manual por item — o estado `expanded` permanece em uso.

Nenhuma outra mudança é necessária; a mesma view é compartilhada pelas áreas de Qualidade, RH e Coordenadores, então a remoção se aplica a todas.
