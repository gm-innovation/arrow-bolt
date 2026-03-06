
Objetivo: fixar o botão “Alterar capa” no canto inferior direito em ambos os estados (sem capa e com capa carregada).

Diagnóstico
- A causa está no próprio container do botão em `src/pages/corp/UserProfile.tsx`.
- Ele está com classes conflitantes: `absolute ... relative ...`.
- Quando `relative` prevalece, o botão entra no fluxo normal da `<div className="h-48">`, ficando:
  - no topo esquerdo quando não há imagem;
  - no canto inferior esquerdo depois que a imagem ocupa a área da capa.

Plano de correção
1. Ajustar posicionamento do botão da capa (arquivo: `src/pages/corp/UserProfile.tsx`)
- Remover `relative` do container do botão.
- Manter apenas posicionamento absoluto ancorado no bloco da capa:
  - `absolute bottom-3 right-3 z-10`
- Garantir comportamento visual estável com `inline-flex`/`w-fit` para não expandir largura indevida.

2. Manter input transparente sobre o botão (sem alterar lógica de upload)
- Preservar o `input type="file"` absoluto (`inset-0`, `opacity-0`, `cursor-pointer`) para clique nativo.
- Manter `onChange`, `uploadCover(...)` e `e.target.value = ''` como já está.

3. Validação funcional (desktop)
- Estado sem capa: botão no canto inferior direito.
- Estado com capa carregada: botão permanece no canto inferior direito.
- Clique no botão abre seletor normalmente.
- Seleção de arquivo continua atualizando a capa sem regressão.

Detalhes técnicos (resumo)
- Classe de posição final do wrapper do botão: `absolute bottom-3 right-3 ...` (sem `relative`).
- Nenhuma alteração em backend, storage, queries, ou fluxo de avatar.
- Escopo mínimo: apenas layout/posição do botão de capa.
