# Marina: voz feminina, conversa mais natural e criação de item de Roadmap em um turno

Três ajustes pontuais, sem mexer em RLS nem em esquema de banco.

## 1. Voz feminina e mais natural

Hoje a função de voz usa a voz `alloy` (neutra/andrógina, soa masculina em pt-BR) com uma instrução curta de entonação.

O que muda:
- Voz padrão passa a ser **`coral`** (feminina, expressiva) — alternativa `shimmer`/`sage` caso você prefira mais suave.
- Instruções de fala reescritas para naturalidade: pausas em vírgulas e pontos, entonação variada, ritmo de conversa real, evitar cadência de locutor/leitura, números e siglas ditos como um brasileiro falaria (ex.: "OS mil e trinta e seis"), sem soletrar markdown.
- Voz configurável: se `ai_agents.identity.voice` estiver definida, ela vence o padrão; o front continua podendo enviar `voice` na requisição.
- Velocidade levemente acima do padrão (1.03) para tirar o efeito arrastado.

## 2. Interação menos robótica

Adicionar ao prompt de sistema um bloco curto de **naturalidade** (junto de Agilidade/Estilo), com regras como:
- Falar como uma colega de trabalho experiente: frases variadas, sem abrir sempre com a mesma estrutura ("Claro!", "Entendido:", "Aqui está...").
- Sem eco da pergunta, sem rótulos burocráticos, sem listas quando 2 frases resolvem.
- Contrações e linguagem natural do pt-BR falado; markdown só quando ajuda de verdade.
- Emojis no máximo esporádicos e com função (nunca decorativos em série).
- Erros e limitações ditos em linguagem humana, não em jargão de sistema.

Isso vale para todos os agentes, sem recriar nenhum: o bloco é adicionado ao construtor do prompt.

## 3. Criação de item no Roadmap sem segundo turno

Hoje a descrição do item é opcional e a ferramenta orienta a "confirmar título, módulo e horizonte", o que gera uma segunda rodada de perguntas.

O que muda:
- Na primeira resposta, quando o usuário sinalizar que quer criar item no Roadmap, a Marina pede **em uma única mensagem numerada**: descrição/objetivo, módulo impactado e horizonte — já propondo valores inferidos do contexto (tela atual, conversa) como padrão, para o usuário só confirmar.
- Se o usuário já deu contexto suficiente na conversa, a Marina **redige a descrição sozinha**, mostra o resumo e pede apenas o "pode criar".
- Nunca criar item com descrição vazia: se não houver como inferir, a descrição é solicitada nessa mesma primeira mensagem.

## 4. Configuração na área de IA (Super Admin)

Em **Gestão de Agentes de IA**, os novos ajustes ficam editáveis por agente, sem precisar recriar nada:

- **Aba Identidade → "Voz"**: seletor de voz feminina/masculina/neutra (coral, shimmer, sage, nova, alloy, echo) com botão "Ouvir amostra", campo de velocidade da fala e um campo de instruções de entonação (texto livre, com o padrão já preenchido).
- **Aba Comportamento → "Naturalidade"**: controle de nível de naturalidade (mecânica / natural / bem conversacional), switch de uso de emojis e switch "evitar aberturas repetitivas". Esses valores alimentam o bloco de naturalidade do prompt.
- **Aba Comportamento → "Coleta de dados em criações"**: switch "pedir todos os campos numa única mensagem" e switch "descrição obrigatória ao criar item de Roadmap", que controlam o comportamento descrito no item 3.

Também na conta do usuário (**Minha Conta → Configurações → Assistente de IA**), junto das preferências já existentes: escolha da voz preferida e da velocidade, sobrescrevendo o padrão do agente.

## Detalhes técnicos

**`supabase/functions/ai-text-to-speech/index.ts`**
- `DEFAULT_VOICE` → `"coral"`; `INSTRUCTIONS` reescritas (naturalidade/prosódia em pt-BR); `speed` default 1.03 quando o cliente não enviar.
- Precedência de voz: `body.voice` → `identity.voice` do agente padrão (leitura simples de `ai_agents`, com fallback silencioso) → `coral`.

**`supabase/functions/ai-assistant/index.ts`**
- `buildSystemPrompt`: novo bloco `NATURALIDADE (N1..N6)` inserido após o bloco de Estilo; ajuste da regra 5 para não pedir "seja conversacional" de forma genérica.
- Regras de PM (`P2`/`P4`): instrução explícita de coletar descrição + módulo + horizonte numa única mensagem, com valores sugeridos.

**`supabase/functions/ai-assistant/tools.ts`**
- `create_roadmap_item`: `description` da spec reescrita ("colete descrição, módulo e horizonte na MESMA mensagem, sugerindo valores inferidos; não chame sem descrição") e `description` adicionada a `required`, mantendo o restante do handler (RLS, `logAction`, `triggerDevPrompt`) intacto.

**Frontend**
- `src/hooks/useSpeechPlayback.ts`: passa a enviar `voice` opcional (sem alterar comportamento atual quando não informada). Nenhuma mudança de tipagem pública.

Todas as strings visíveis seguem em pt-BR.
