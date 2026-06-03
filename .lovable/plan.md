# Mover instruções/comportamento da Marina para o gerenciador

## Diagnóstico

Você está certo. O edge function `ai-assistant` está montando o system prompt com texto fixo no código (regras, lista de módulos, tom default, etc.). A aba **Comportamento** do gerenciador de agentes já expõe os campos certos:

- `behavior.role_instructions[role]` — texto livre por perfil (technician, coordinator, manager, director, hr, commercial, financeiro, qualidade, compras).
- `behavior.memory_size` — quantas mensagens de histórico enviar.
- `behavior.auto_flows` — flags para fluxos automáticos (detectar relatório, disponibilidade, status OS, ranking).
- `behavior.suggested_prompts` — prompts sugeridos iniciais.
- `behavior.handoff_channel` / `handoff_target` — para escalonamento.

A aba **Identidade** já fornece `identity.persona`, `identity.tone`, `identity.name` — esses sim estão sendo lidos. Os outros campos do gerenciador são ignorados pelo backend.

## Mudanças

Arquivo: `supabase/functions/ai-assistant/index.ts`

1. **Ler todo o `behavior` do agente** (já carregamos `agent.behavior`, basta usar).
2. **Injetar `role_instructions[role]`** no system prompt: se houver um texto cadastrado para o role atual, anexar como bloco "Instruções específicas para este perfil:". Se não houver, não cair em texto hardcoded — apenas omitir o bloco.
3. **Respeitar `memory_size`**: usar `behavior.memory_size ?? 10` no slice do histórico (hoje está fixo em 10).
4. **Respeitar `auto_flows`**:
   - `detect_report`: só rodar o `handleTechnicianReport` se essa flag estiver ligada (default ligado para compatibilidade).
   - As demais flags ficam reservadas (não há lógica equivalente hoje após o tool-calling, mas mantemos o campo lido para uso futuro).
5. **Lista de módulos liberados** (hoje no prompt) → manter, mas como bloco curto e neutro; as instruções de tom/regras passam a vir de `identity.persona` + `identity.tone` + `behavior.role_instructions[role]`. Único bloco realmente fixo no código será:
   - Data de hoje
   - Lista dos módulos que o role pode consultar (essa lista vem do mapa de permissões, que é código por segurança — não deve ser editável no painel)
   - Regra técnica "Use as ferramentas antes de negar informação" (essa é uma regra de funcionamento do tool calling, não de comportamento de marca)
6. **Aba Comportamento permanece como é** — não vou mexer no frontend, ela já está correta.

## Resultado

- Editando "Coordinator" na aba Comportamento e salvando → na próxima mensagem da Marina, aquele texto aparece no system prompt do edge function.
- `memory_size` muda quantas mensagens ela "lembra".
- `auto_flows.detect_report = false` desliga a extração automática de relatórios.

## Detalhe técnico

Sem mudanças de schema. Sem mudanças no frontend. Apenas refactor no `index.ts`:

```text
buildSystemPrompt(opts) — passa a receber também:
  - roleInstruction: string | undefined  (behavior.role_instructions[role])
  - persona, tone vindos do identity (já vem)
  - lista de módulos (vem do mapa, não do banco)

handler principal:
  - lê behavior.memory_size para o slice de histórico
  - lê behavior.auto_flows.detect_report (default true) para decidir o fluxo do técnico
```
