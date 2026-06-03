# Avatar da Agente de IA

## Objetivo
Criar um avatar visual para a agente de IA (moça jovem, macacão laranja/coral) e disponibilizá-lo em todos os pontos onde o agente aparece.

## Passos

1. **Gerar imagem do avatar**
   - Usar `imagegen--generate_image` (modelo `premium`, fundo transparente PNG).
   - Prompt: retrato 3/4, jovem mulher amigável, sorriso suave, cabelo escuro preso, macacão coral/laranja vibrante estilo técnico-naval moderno, iluminação suave, estilo ilustração semi-realista limpa, fundo branco sólido (para remoção).
   - Salvar em `src/assets/ai-agent-avatar.png` + upload via `lovable-assets` para CDN.
   - Gerar também variante quadrada 512x512 otimizada para uso como avatar circular.

2. **Disponibilizar no Storage público**
   - Subir para bucket público `ai-assets` (criar se não existir, via migration) para que o widget e canais externos (WhatsApp/Teams) consigam referenciar por URL.

3. **Definir como avatar padrão da agente "Marina"**
   - Atualizar o registro `ai_agents` padrão (`is_default = true`) preenchendo `identity.avatar_url` com a URL do CDN.
   - Migration de seed/update idempotente.

4. **UI — upload e preview de avatar no Super Admin**
   - Em `IdentityTab.tsx`, substituir o campo texto "URL do avatar" por um componente reutilizando o padrão `AvatarUpload` (com fallback a URL manual).
   - Upload vai para `ai-assets/{agent_id}/avatar-{timestamp}.png` com cache busting.
   - Mostrar preview circular ao lado do nome.

5. **Renderizar no widget e no chat**
   - `AIAssistant.tsx` / `AIChat.tsx`: usar `agent.identity.avatar_url` no botão flutuante (substitui ícone `Bot`) e nas bolhas de mensagem da IA.
   - Fallback para ícone `Bot` quando avatar ausente.
   - Respeitar `appearance.shape` (circle/rounded/pill) no recorte.

## Detalhes técnicos

- **Bucket `ai-assets`**: público, RLS permitindo INSERT/UPDATE apenas a super_admin; SELECT público.
- **AvatarUpload**: componente já existe em `src/components/ui/AvatarUpload.tsx` — reutilizar com handler customizado para bucket `ai-assets`.
- **Cache busting**: anexar `?v={updated_at}` à URL no widget para refletir trocas imediatas.
- **Tamanho**: 512x512 PNG transparente; o widget exibe em 40px e o painel em 80px.

## Fora de escopo
- Animações faciais / lip-sync.
- Múltiplos avatares por estado emocional (pode ser próxima fase).
- Geração via vídeo (Heygen/D-ID).
