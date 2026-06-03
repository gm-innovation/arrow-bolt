# Ajustes no Chat da Marina

## 1. Auto-scroll do chat (`src/components/ai/AIChat.tsx`)

O `ref` está sendo passado ao `<ScrollArea>` (componente shadcn baseado em Radix), mas o elemento que realmente rola é o `viewport` interno (`[data-radix-scroll-area-viewport]`), não o root. Por isso `scrollTop = scrollHeight` não funciona.

Correções:
- Trocar o `useRef<HTMLDivElement>` por uma ref que aponte para o viewport: buscar `scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]')` dentro do `useEffect` e setar `scrollTop` nele.
- Adicionar `isLoading` e `reportPreview` às dependências do `useEffect` para também rolar quando o "Pensando..." aparece e quando a resposta final chega (mensagem nova com `content` preenchido dispara via `messages`, mas garantimos com `isLoading` também).
- Usar `requestAnimationFrame` antes de setar o scroll para garantir que o DOM já renderizou a nova mensagem.

Nenhuma outra mudança de UI.

## 2. Respostas mais diretas e inteligentes

Dois pontos, sem hardcode de comportamento por agente — apenas defaults e uma regra técnica universal:

### 2a. Regra global no system prompt (`supabase/functions/ai-assistant/index.ts`, função `buildSystemPrompt`)
Adicionar nas "REGRAS CRÍTICAS" uma regra de diretividade que vale para qualquer agente:

> "Seja direto. Quando o usuário fizer um pedido executável (ex.: 'busque', 'liste', 'mostre'), execute imediatamente a ferramenta apropriada com parâmetros padrão razoáveis (sem filtros = busca geral) em vez de pedir confirmação ou esclarecimento. Só pergunte se faltar informação realmente obrigatória e não inferível. Evite respostas em duas etapas ('posso buscar?' → busca); faça a busca e mostre o resultado."

Isso resolve o caso da captura: "só procure" → ela deveria já ter chamado a tool sem perguntar de novo.

### 2b. Ajustar default da role `commercial`
Atualizar `DEFAULT_ROLE_INSTRUCTIONS.commercial` reforçando: "Aja, não pergunte. Se o usuário disser 'veja leads novos' ou 'só procure', execute a busca com filtros padrão (últimos 7 dias, todos os status) e apresente o resultado direto. Reserve perguntas só para quando o resultado for ambíguo."

### 2c. Seed no banco
Migration `UPDATE ai_agents` para sobrescrever (não mais COALESCE) `behavior.role_instructions.commercial` da Marina com o texto novo — caso contrário, o seed antigo continua valendo. Demais roles permanecem como estão (já preenchidas).

## Arquivos afetados
- `src/components/ai/AIChat.tsx` — correção do auto-scroll
- `supabase/functions/ai-assistant/index.ts` — nova regra global + texto default do commercial
- Nova migration — atualiza `role_instructions.commercial` da Marina

## Validação
1. Abrir o chat da Marina, mandar várias mensagens seguidas → scroll desce sozinho até a última resposta.
2. Repetir "veja se há leads novos" → "só procure": ela deve executar a busca direto e devolver a lista, sem nova pergunta.
