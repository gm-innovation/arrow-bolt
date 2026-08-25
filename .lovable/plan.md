# Plano: Mover Laboratório de Voz de volta para baixo do avatar

## Problema
A aba "Voz" foi adicionada como uma 10ª aba na barra superior de `AIManagement.tsx` (`grid-cols-10`), causando sobreposição de texto entre as abas. O usuário quer o conteúdo de volta no local original: dentro da aba Identidade, abaixo do avatar, onde já existe uma seção "Voz da assistente".

## Mudanças

### 1. `src/pages/super-admin/AIManagement.tsx`
- Remover o `<TabsTrigger value="voice">` e o `<TabsContent value="voice">` da barra de abas.
- Voltar `TabsList` de `grid-cols-10` para `grid-cols-9`.
- Remover o import de `VoiceLabTab`.

### 2. `src/components/super-admin/ai/IdentityTab.tsx`
- Substituir a seção "Voz da assistente" atual (linhas 148–208, que só tem voz OpenAI simples) pelo conteúdo do `VoiceLabTab` (comparação multi-engine: Gemini, OpenAI, ElevenLabs).
- O `VoiceLabTab` faz mutação direta via `useUpdateAIAgent` (não usa `draft`), então a integração funcionará como componente filho dentro do `IdentityTab`, recebendo `agent` como prop.
- Manter a seção dentro do mesmo card/box visual, abaixo do avatar.

### 3. `src/components/super-admin/ai/VoiceLabTab.tsx`
- Remover o `max-w-3xl` do container externo para que se adapte à largura do `IdentityTab` (`max-w-2xl`).
- Sem outras mudanças — o componente continua funcionando como antes, só muda onde é renderizado.

## Resultado
- 9 abas na barra superior (sem sobreposição).
- Laboratório de Voz aparece na aba Identidade, abaixo do avatar, com a mesma funcionalidade de comparação entre motores.
