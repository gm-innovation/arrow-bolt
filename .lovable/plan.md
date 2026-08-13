# Modal de Nova Solicitação de Férias: voltar a rolar

O diálogo cresceu com a lista de colaboradores embutida e passou a ultrapassar a altura da tela: o cabeçalho e os botões de ação saem de vista e o conteúdo não rola.

## O que muda

- O diálogo passa a ter altura máxima de ~85% da tela: cabeçalho fixo no topo, botões (Cancelar / Registrar) fixos no rodapé e apenas o meio do formulário rolando.
- A lista de colaboradores encolhe (altura de ~11rem) e só aparece quando não há colaborador escolhido ou quando há texto digitado na busca; ao selecionar alguém, a lista recolhe e fica visível apenas o nome selecionado com um botão "Trocar".
- Assim o formulário inteiro (tipo, abono, datas, divisão, justificativa) volta a caber sem competir com a rolagem interna da lista.
- Nenhuma mudança de validação, dados ou fluxo de aprovação.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx`, `NewRequestDialog`: `DialogContent` com `max-h-[85vh] overflow-hidden flex flex-col p-0`; cabeçalho e `DialogFooter` fora da área rolável; corpo em `div className="flex-1 overflow-y-auto px-6 py-4"`.
- Lista de colaboradores: `max-h-44 overflow-y-auto`, renderizada condicionalmente (`!employeeId || employeeSearch`); botão "Trocar" limpa `employeeId`/`employeeSearch`.
