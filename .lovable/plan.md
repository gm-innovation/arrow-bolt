# Marina: cadastro sempre fresco + aviso de mudança (telefone/função)

## Diagnóstico confirmado (dados reais do Hugo)

Verifiquei o banco: o `ai_user_memory` do Hugo está **vazio** — o problema não é um fato salvo. As fontes reais do dado desatualizado são:

1. **Perfil/função confiados ao frontend**: a edge function `ai-assistant` recebe `userRole` no corpo da requisição (vem do `AuthContext`, carregado 1x por sessão) e **nunca revalida** contra `user_roles`. Se a função muda no painel, a Marina usa o papel velho até relogar.
2. **Telefone não entra no contexto**: o prompt só recebe `full_name`. Quando a Marina repete telefone antigo, ele vem do **histórico/foco da conversa** (mensagens e foco persistidos em `ai_conversations`), não de consulta nova.
3. **`channel_identities` fica preso ao número antigo**: o WhatsApp do Hugo está vinculado a `5521990952785`; se o cadastro do RH muda, o vínculo não avisa ninguém.

## O que será implementado

### 1. Snapshot cadastral verificado no servidor (a cada mensagem)
Custo desprezível: a função já faz 1 query em `profiles` por requisição; ela passa a trazer `phone` e `position` e mais 1 query pequena em `user_roles`.

- O **papel usado para ferramentas e prompt passa a ser o do banco** (não o do frontend). Mudança de função vale na próxima mensagem, sem relogar.
- Novo bloco no prompt `CADASTRO ATUAL (lido agora do banco)`: nome, função/cargo, telefone, empresa.
- Regra no prompt: se o histórico da conversa citar telefone/função diferente deste bloco, **o bloco vence** e a Marina avisa a diferença em vez de repetir o dado velho.

### 2. Aviso proativo de mudança (diff com último snapshot)
- Nova coluna `last_cadastro_snapshot` (jsonb) em `ai_user_preferences`: guarda telefone, papel, cargo e data do último atendimento.
- A cada requisição, a função compara o cadastro fresco com o snapshot:
  - **Mudou** → injeta instrução para a Marina avisar uma vez, de forma natural ("Vi que seu número/cargo mudou no cadastro — já estou usando o novo"), e atualiza o snapshot.
  - Se o telefone mudou e o WhatsApp vinculado (`channel_identities`) ainda é o antigo, o aviso inclui isso.
- Sem triggers de banco: o diff acontece na leitura que já existe, então funciona para qualquer origem de alteração (painel admin, RH, SQL).

### 3. Reconsulta sob demanda ("consulta de novo")
- Nova ferramenta `get_my_cadastro` (todos os papéis): relê na hora `profiles` + `user_roles` + contato principal do RH (`hr_employee_contacts`) + número de WhatsApp vinculado, e responde só com os dados do próprio usuário.
- Descrição da ferramenta instrui a Marina a chamá-la sempre que o usuário perguntar dos próprios dados/permissões ou pedir para "verificar de novo" — e a confiar nela acima do histórico.

### 4. Frontend: papel fresco ao voltar para a aba (leve)
- `AuthContext` passa a refazer `fetchUserRole` quando a aba volta a ficar visível (`visibilitychange`), com o debounce já existente. Assim a UI (menus) também reflete mudança de função sem relogar — complementa o item 1, que já corrige a Marina sozinho.

## Fora de escopo
- Não muda o fluxo de pareamento do WhatsApp nem a RPC `resolve_employee_by_phone` (já leem dados frescos).

## Detalhes técnicos
- **Migration**: `ALTER TABLE ai_user_preferences ADD COLUMN last_cadastro_snapshot jsonb` (tabela existente, sem novos GRANTs).
- **Arquivos**: `supabase/functions/ai-assistant/index.ts` (snapshot, diff, bloco de prompt, papel do servidor), `supabase/functions/ai-assistant/tools.ts` (ferramenta `get_my_cadastro`), `src/contexts/AuthContext.tsx` (refetch no `visibilitychange`).
- **Segurança**: snapshot usa service role somente para ler o próprio usuário verificado (`verifiedUserId`); `get_my_cadastro` filtra por `ctx.userId` — nenhum dado de terceiros exposto; RLS inalterado.
- **Deploy**: redeploy da edge function `ai-assistant` após a migration.

## Validação
1. Alterar telefone do Hugo no cadastro → próxima mensagem à Marina deve trazer o aviso de mudança e o número novo.
2. Perguntar "qual meu telefone?" → resposta com o número novo, não o do histórico.
3. Mudar papel de um usuário de teste → na mensagem seguinte a Marina já age com as permissões novas (sem relogar).
