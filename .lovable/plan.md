

## Plano: Corrigir visibilidade de "Publicações compartilhadas" e adicionar botão de mensagem

### Problema
Ao visitar o perfil de outro usuário, aparece "Publicações compartilhadas comigo" — seção que só faz sentido para o dono do perfil. Falta também um botão para enviar mensagem ao usuário visitado.

### Mudanças

**`src/pages/corp/UserProfile.tsx`**:
1. Renderizar `UserProfileSharedPosts` apenas quando `isOwnProfile === true`
2. Quando `!isOwnProfile`, exibir no lugar um card com botão "Enviar mensagem" que navega para o chat (criando ou abrindo conversa com o usuário)
3. Adicionar botão "Enviar mensagem" também na área do perfil (próximo ao nome/badge), visível apenas para visitantes

### Lógica do botão "Enviar mensagem"
- Ao clicar, navegar para a rota de chat do papel atual do usuário logado
- Passar o `targetUserId` como parâmetro para iniciar/abrir conversa com esse usuário

