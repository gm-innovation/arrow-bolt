# Botão de teste de fala

Hoje é possível escolher voz, velocidade e instruções de entonação, mas só se ouve o resultado abrindo o chat e mandando a Marina falar. Vamos adicionar um botão "Testar voz" ao lado das configurações, que lê uma frase de exemplo já usando exatamente os valores que estão na tela (mesmo antes de salvar).

## Onde entra

1. **Super Admin → IA → Identidade** (bloco "Voz da assistente")
   - Botão "Testar voz" com ícone de alto-falante ao lado do seletor de voz.
   - Enquanto está falando, o botão vira "Parar" para interromper na hora.
   - Usa a voz, a velocidade e as instruções de entonação do formulário atual (inclusive alterações não salvas), para o gestor comparar vozes antes de gravar.
   - Frase de exemplo em pt-BR, com nome do agente, número e sigla, para dar para julgar entonação (ex.: "Oi, eu sou a Marina. A OS 1036 foi concluída ontem e o relatório já está assinado.").

2. **Minha conta → Assistente de IA**
   - Mesmo botão ao lado dos campos de voz/velocidade, testando a preferência escolhida pelo usuário ("Padrão do assistente" testa a voz configurada pelo Super Admin).

## Comportamento

- Um teste por vez: iniciar um novo teste interrompe o anterior.
- Sair da tela ou trocar de aba interrompe o áudio.
- Se a síntese falhar (sem crédito, sessão expirada, erro do provedor), aparece um aviso curto em português e o botão volta ao estado normal.

## Detalhes técnicos

- Reaproveitar `useSpeechPlayback` (`speak(texto, id, { voice, speed })`), que já faz streaming PCM, parada e limpeza do `AudioContext`.
- Estender a chamada da Edge Function `ai-text-to-speech` para aceitar também `instructions` opcional no corpo, com precedência: requisição → `identity.voice_instructions` do agente → padrão feminino. Isso permite testar instruções ainda não salvas.
- Repassar `instructions` como terceiro campo opcional em `speak(..., { voice, speed, instructions })` em `src/hooks/useSpeechPlayback.ts`.
- Novo componente compartilhado `src/components/ai/VoiceTestButton.tsx` (props: `voice?`, `speed?`, `instructions?`, `sampleText?`), usado por `IdentityTab.tsx` e `AIPreferencesCard.tsx`.
- Redeploy da função `ai-text-to-speech` após a mudança.
