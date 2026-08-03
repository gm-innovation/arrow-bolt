# Marina mais ágil e personalizada

Objetivo: reduzir perguntas desnecessárias, reconhecer o usuário pelo nome e lembrar o estilo de interação preferido entre sessões.

## O que muda para o usuário

1. **Saudação pelo nome.** Ao abrir o chat, a mensagem inicial usa o primeiro nome do usuário logado (ex.: "Olá, Rayane! No que te ajudo?"), em vez do texto genérico.
2. **Menos perguntas, mais ação.** O agente passa a inferir o que falta a partir do contexto (tela atual, papel, empresa, histórico) e só pergunta quando a informação for indispensável — e, nesse caso, junta todas as dúvidas em uma única pergunta numerada.
3. **Preferências de interação persistentes.** Cada usuário terá preferências próprias: tamanho da resposta (concisa/equilibrada/detalhada), tom (formal/neutro/informal), nível de proatividade (baixo/médio/alto) e uso do nome (sim/não). Ficam salvas e valem em qualquer sessão e dispositivo.
4. **Aprendizado durante a conversa.** Quando o usuário disser coisas como "responda mais curto", "sem rodeios", "me chama de Rai", "pode me tratar formalmente", o agente registra essa preferência e passa a aplicá-la nas conversas seguintes, confirmando em uma frase.
5. **Painel de preferências.** Em "Minha Conta → Configurações", uma seção "Assistente de IA" permite ver e ajustar manualmente as mesmas preferências, além de zerá-las.
6. **Configuração global.** Na gestão de Agentes de IA (Super Admin, aba Comportamento), novos controles definem o padrão da empresa: nível de agilidade, proatividade padrão, uso do nome e se o agente pode aprender preferências. Vale para todos os agentes já existentes por meio de valores padrão — nenhum agente precisa ser recriado.

## Regras de comportamento aplicadas ao agente

- Nunca pedir dado que já esteja no contexto (usuário, empresa, papel, tela atual, itens já listados na conversa).
- No máximo uma rodada de perguntas antes de agir; se ainda houver ambiguidade, assumir a interpretação mais provável, executar e dizer o que assumiu.
- Confirmação explícita continua obrigatória para escrita e exclusão (regras atuais de RLS e de duas etapas na exclusão permanecem intactas).
- Respostas concisas por padrão: sem repetir a pergunta, sem preâmbulo, sem listar o que "poderia" fazer quando já é possível fazer.

## Detalhes técnicos

**Banco (nova tabela `ai_user_preferences`)**
- Colunas: `user_id` (PK, FK `auth.users`), `company_id`, `preferred_name`, `verbosity` (`concise|balanced|detailed`), `tone` (`formal|neutral|informal`), `proactivity` (`low|medium|high`), `use_name` (bool), `learned_notes` (jsonb, lista curta de preferências aprendidas com data), timestamps.
- Migração inclui `GRANT` para `authenticated`/`service_role`, RLS habilitado e políticas: o usuário lê/escreve apenas a própria linha; `service_role` para a Edge Function.

**Edge Function `ai-assistant` (`supabase/functions/ai-assistant/index.ts`)**
- Após verificar o JWT, buscar `profiles.full_name` do `verifiedUserId` e a linha de `ai_user_preferences` (criando padrão em memória se não existir).
- `buildSystemPrompt` recebe `userProfile` (nome, primeiro nome, papel) e `userPrefs`, e ganha dois blocos novos: "PERFIL DO USUÁRIO" e "ESTILO DE INTERAÇÃO", além do bloco "AGILIDADE" com as regras acima. Os defaults vêm de `behavior.agility` do agente e são sobrescritos pelas preferências do usuário.
- Novas ferramentas em `tools.ts`, disponíveis para todos os papéis:
  - `get_my_ai_preferences` — leitura.
  - `set_my_ai_preferences` — grava via cliente com JWT (`userSupabase`), respeitando RLS; aceita apenas os campos tipados acima e limita `learned_notes` a ~10 itens.
- Tipagem estrita: tipos `AIUserPreferences` e uniões literais para `verbosity`/`tone`/`proactivity`, compartilhados entre função e frontend.

**Frontend**
- `src/hooks/useAIUserPreferences.ts` (novo): leitura/escrita via TanStack Query.
- `src/components/ai/AIChat.tsx` / `useAIChat`: mensagem inicial personalizada com `preferred_name` ou primeiro nome do `profile` do `AuthContext`; invalidar as preferências ao fim de uma resposta que as alterou.
- `src/components/super-admin/ai/BehaviorTab.tsx`: bloco "Agilidade e personalização" (select de agilidade, proatividade padrão, switches de uso do nome e de aprendizado), salvos em `behavior.agility` do agente.
- `src/hooks/useAIAgents.ts`: estender `AIAgentBehavior` com `agility`.
- Nova seção em `src/pages/account/AccountSettings.tsx` para o usuário ajustar as próprias preferências.
- Todas as strings visíveis em pt-BR, centralizadas em constantes de rótulo para facilitar i18n futura.

Observação: os caminhos citados no pedido (`app/api/...`, `app/utils/ai/prompts.ts`) são de outra estrutura de projeto; o Arrow concentra essa lógica na Edge Function `ai-assistant` e nos componentes acima.
