

## Plano: Mostrar publicações do usuário visitado no perfil (estilo feed)

### Problema
Quando visito o perfil de outro usuário, aparece um card "Enviar mensagem" em vez de exibir as publicações desse usuário. O correto é mostrar as publicações do usuário visitado no estilo feed — o chat é um recurso separado.

### Mudanças

**`src/pages/corp/UserProfile.tsx`** (linhas 357-373):
1. Remover o bloco condicional `isOwnProfile ? ... : <Card "Enviar mensagem">` 
2. Em ambos os casos (próprio perfil ou visitante), exibir na coluna central:
   - Se `isOwnProfile`: manter `UserProfileSharedPosts` (publicações compartilhadas comigo)
   - Se `!isOwnProfile`: criar um componente similar que liste as **publicações feitas pelo usuário visitado** (`corp_feed_posts` onde `author_id = targetUserId`), exibindo-as como cards de feed com conteúdo, anexos e timestamp
3. Manter o botão "Enviar mensagem" apenas no cabeçalho do perfil (ao lado do nome), onde já existe

### Implementação da coluna central para visitantes
- Criar um novo componente `UserProfilePosts` (ou reutilizar lógica inline) que busca `corp_feed_posts` por `author_id = targetUserId`
- Exibir os posts com o mesmo estilo de card do `UserProfileSharedPosts`: avatar do autor, conteúdo, anexos, data
- Título da seção: "Publicações de {nome}"

### Arquivos afetados
- `src/pages/corp/UserProfile.tsx` — ajustar condicional da coluna central
- `src/components/corp/UserProfilePosts.tsx` — novo componente para listar posts do usuário visitado

