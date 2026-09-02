# Prompt do Lovable gerado pelo motor externo (Hermes)

A Caixa de Suporte já tem o bloco "Prompt sugerido para correção", com estados de geração, botão Copiar e botão Regerar, e a geração já é disparada automaticamente quando a Marina abre o chamado. O que muda é **quem escreve o prompt**: hoje é uma chamada direta ao modelo do gateway; passa a ser o motor externo usando a habilidade `lovable-prompt-engineer`, no formato MODE / COMPONENT / TASK.

## O que o usuário vai perceber

- Ao abrir um chamado pela Marina, o prompt continua sendo gerado sozinho — agora no formato Lovable (MODE, COMPONENT, TASK, CONTEXT, REQUISITOS, CONSTRAINTS), em português.
- No painel do chamado, o rótulo passa a "Prompt para Lovable"; enquanto gera, aparece "Gerando prompt..." com indicador girando (a geração pelo motor pode levar alguns minutos).
- Se falhar, mensagem amigável em português ("Não consegui gerar o prompt agora. Tente novamente.") com botão **Tentar novamente**.
- Botão **Regenerar prompt** logo abaixo do bloco de código, para pedir outra versão quando a primeira não ficar boa.
- Nada muda nas telas de chat da Marina nem no restante do design.

## Detalhes técnicos

**Edge Function `generate-ticket-dev-prompt`** (já existe, será reescrita internamente):

- Passa a chamar o motor externo por `engineText()` (mesmo cliente já usado pela Marina, em `marina-chat/hermes.ts`) — endpoint e chave vêm dos segredos do backend (`HERMES_BASE_URL` / `HERMES_API_KEY`), nunca do código nem do frontend. Como a função vive fora de `marina-chat/`, o cliente `hermes.ts` e o `llm.ts` compartilhado são reutilizados por import relativo (`../marina-chat/hermes.ts`).
- Mensagem enviada: pedido explícito de uso da habilidade `lovable-prompt-engineer`, com TIPO (categoria), TÍTULO, DESCRIÇÃO, ONDE (página/rota + papel do usuário) e EVIDÊNCIA (trecho da conversa com a Marina), terminando com "Retorne APENAS o prompt formatado, pronto para copiar e colar no Lovable".
- `stream: false`, `max_tokens` 2000, timeout de 300 s (`AbortSignal` de 300000 ms), prioridade `fundo` no controle de vagas do motor.
- Resposta tratada como **texto puro** (o prompt), não JSON: grava em `dev_prompt`, com `dev_prompt_status = 'ready'`, `dev_prompt_generated_at` e `dev_prompt_model = 'hermes-agent'`. `suggested_area` e `suggested_files` deixam de ser exigidos; se vierem em linhas do tipo `ÁREA:` / `ARQUIVOS:` no texto, são extraídos, senão ficam nulos.
- Saída passa pelo `sanitize` já existente, para o nome do motor/modelo não aparecer ao colaborador.
- Se o motor não estiver configurado, estiver fora do ar, sem vaga ou estourar o tempo: grava `dev_prompt_status = 'failed'` com `dev_prompt_error` amigável em pt-BR e, como rede de segurança, faz uma tentativa pelo gateway atual mantendo o mesmo formato de prompt (para o chamado nunca ficar sem prompt).
- Continua registrada em `supabase/config.toml` (sem mudança de `verify_jwt`), e continua sendo chamada em disparo automático por `ai-assistant` na criação do chamado.

**Banco**: nenhuma migração — as colunas `dev_prompt`, `dev_prompt_status`, `dev_prompt_error`, `dev_prompt_generated_at`, `dev_prompt_model` já existem em `support_tickets`.

**Frontend `src/pages/super-admin/SupportInbox.tsx`** (apenas apresentação):

- Título do bloco → "Prompt para Lovable"; textos de estado ajustados ("Gerando prompt...", mensagem de erro amigável).
- Botão de repetição rotulado **Regenerar prompt** (ou **Tentar novamente** no estado de falha), movido para baixo do bloco de código; **Copiar** permanece no topo do bloco.
- Bloco de código com `overflow-auto` e quebra de linha, responsivo (botões empilham em telas pequenas). Sem novas cores — segue os tokens do tema atual.
- O tempo considerado "interrompido" para uma geração pendente sobe para 300 s, alinhado ao timeout do motor.

**Não muda**: páginas de chat da Marina, `PMDashboard`, `triage-ticket-reply`, permissões/RLS de `support_tickets`.
