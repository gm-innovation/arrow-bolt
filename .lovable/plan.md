
Objetivo: corrigir de forma definitiva o clique em “Alterar capa”, porque hoje o seletor nem abre.

Diagnóstico (com base no runtime e código atual)
- Sintoma confirmado: “Não abre seletor”.
- Evidência técnica: não há nenhuma requisição de upload/update após o clique (falha antes do `onChange`).
- O fluxo atual da capa usa `label htmlFor` + `input type="file"` com `className="hidden"` (`display: none`).
- Esse padrão pode falhar em alguns contextos de navegador/extensão; no seu caso, o evento não chega ao input.

Do I know what the issue is?
- Sim: o problema está no gatilho de seleção de arquivo (camada UI), não no upload/storage/DB.

Plano de implementação (focado e sem mexer no que já funciona)
1) Trocar o gatilho da capa para input clicável direto (sem `hidden`, sem `ref.click`, sem depender de `htmlFor`)
- Arquivo: `src/pages/corp/UserProfile.tsx`
- Implementar botão visual “Alterar capa” com um `input type="file"` absoluto por cima (`opacity-0`, `absolute inset-0`, `cursor-pointer`), para o clique ser nativo no próprio input.
- Manter acessibilidade (`aria-label`) e visual atual.

2) Manter a lógica de upload existente, só conectando ao novo input
- Reusar `uploadCover(file)` exatamente como está.
- Manter:
  - limpeza de arquivos antigos `cover-*`
  - upload no bucket `user-avatars`
  - `cover_url` com cache-busting `?v=timestamp`
  - `invalidateQueries` + toast de sucesso/erro

3) Blindagem de UX para evitar “clique morto”
- Garantir `z-index` do bloco do botão de capa acima da imagem.
- Adicionar `select-none` no botão visual para impedir seleção de texto acidental.
- Garantir `e.target.value = ''` após `onChange` para permitir reupload do mesmo arquivo.

4) Escopo mínimo
- Não alterar avatar (já funciona).
- Não alterar backend, políticas, tabelas ou rotas.
- Não alterar sidebar neste passo (foco 100% no botão da capa).

Validação E2E (obrigatória)
- Cenário desktop, mesmo usuário e mesma tela:
  1. Clicar “Alterar capa” abre seletor.
  2. Selecionar imagem dispara upload e update de perfil.
  3. Capa renderiza imediatamente.
  4. Repetir com a mesma imagem (confirmar que abre novamente e aceita).
- Checagem técnica:
  - aparece request de upload no storage
  - aparece update em `profiles.cover_url`
  - sem regressão do avatar.
