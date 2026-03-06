

## Plano: Corrigir botão "Alterar capa" e media preview

### Diagnóstico do botão de capa

Confirmado: o avatar funciona, a capa não. Ambos usam o mesmo padrão `ref.click()` + `className="hidden"`. A diferença estrutural é que o input da capa está dentro de um `<Card className="overflow-hidden">` → `<div className="relative h-48">`, enquanto o input do avatar está em outra parte do DOM (dentro do `CardContent`).

O problema é que `coverInputRef.current?.click()` não abre o seletor de arquivo neste contexto específico. Isso pode acontecer por interação com `overflow-hidden` ou pelo posicionamento absoluto do botão sobre a área do cover.

**Solução definitiva**: Usar `<label htmlFor="cover-file-input">` em vez de `ref.click()`. Este é o mecanismo nativo do HTML — clicar em um `<label>` associado a um `<input type="file">` abre o seletor sem depender de JavaScript. É 100% confiável em todos os navegadores e contextos.

### Mudanças

**1. `src/pages/corp/UserProfile.tsx` — Trocar ref.click() por label/htmlFor**
- Remover `coverInputRef`
- Dar um `id="cover-file-input"` ao input hidden
- Trocar o `<button onClick={ref.click()}>` por um `<label htmlFor="cover-file-input">` estilizado como botão
- Manter toda a lógica de upload inalterada
- Aplicar a mesma abordagem de `label` no avatar por consistência (opcional, já que funciona)

**2. `src/components/corp/UserProfileLeftSidebar.tsx` — Corrigir exibição de vídeo e arquivo**
- O `MiniVideoPlayer` falha silenciosamente com erro de CORS (confirmado pelo runtime error `Failed to fetch` no `fetchAsBlob`)
- Simplificar: em vez de tentar reproduzir o vídeo inline (que falha por CORS na sidebar), mostrar um thumbnail/card clicável com ícone de play + nome do arquivo
- Para arquivos (PDF, etc.): garantir que o card com ícone + nome + botão de download está visível e funcional

### Arquivos afetados
- `src/pages/corp/UserProfile.tsx` — label htmlFor no cover input
- `src/components/corp/UserProfileLeftSidebar.tsx` — media rendering simplificado

