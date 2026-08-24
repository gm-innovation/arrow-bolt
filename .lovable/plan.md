# WhatsApp da Marina apontando para o perfil errado (comercial em vez de super admin)

## Diagnóstico confirmado (dados reais)

1. **Vínculo errado**: o número `5521990952785` está ligado em `channel_identities` ao usuário `94809399...` — "HUGO ALEXANDRE SANTOS SILVA" (alexandre.silva@lecsor.com.br, papel **commercial**). A conta super admin é outra: `e9ebd707...` — "Alexandre Silva" (papel **super_admin**).
2. **Causa raiz**: a função `resolve_employee_by_phone` monta candidatos de `profiles.phone` **e** de `hr_employee_contacts` e, em empate, escolhe por `ORDER BY full_name LIMIT 1` — critério arbitrário. O telefone `21990952785` existe nos dois lugares (perfil do Alexandre + contato de RH da ficha do Hugo), então o pareamento pode cair na conta errada.
3. **Conta duplicada**: mesma pessoa com duas contas. Decisão do usuário: **manter só a super admin** e desativar a comercial.

## O que será feito

### 1. Função `resolve_employee_by_phone` com prioridade (migration)
- Candidatos passam a ter fonte rankeada: **1º `profiles.phone`** (cadastro principal), **2º `hr_employee_contacts`** (telefone/celular/whatsapp).
- Desempate seguinte: colaborador com `employee_status` ativo primeiro; por fim nome.
- Mantém `match_count` no retorno para o webhook saber quando houve ambiguidade.

### 2. Correção dos dados (mudança de dados, não de estrutura)
- **`channel_identities`**: o vínculo do número `5521990952785` passa a apontar para a conta super admin (`e9ebd707...`). Na próxima mensagem a Marina já fala com o perfil certo.
- **`hr_employee_contacts` da conta Hugo**: remover o telefone `21990952785` (o número não é dessa conta — é o que causou a ambiguidade).
- **Conta comercial (Hugo)**: `employee_status` → `desligado` e remoção dos papéis em `user_roles`, preservando o histórico (nada é apagado de OSs, relatórios etc.). O login dessa conta deixa de ter acesso operacional.

### 3. Webhook `whatsapp-in`: aviso de ambiguidade (código)
- Quando `match_count > 1`, registrar log com os candidatos e, se nenhum candidato for ativo, não auto-vincular — responde pedindo para falar com o RH em vez de vincular na conta errada.

## Fora de escopo
- Não muda o fluxo de pareamento por código nem o cadastro de contatos do RH.
- A conta comercial não é excluída do banco (preserva histórico); se quiser exclusão total no futuro, é outra tarefa.

## Detalhes técnicos
- **Migration**: `CREATE OR REPLACE FUNCTION public.resolve_employee_by_phone(text)` com `src_rank` na CTE de candidatos e `ORDER BY src_rank, (estatus = 'ativo') DESC, fname`.
- **Dados**: `UPDATE channel_identities SET user_id = 'e9ebd707-...' WHERE external_id = '5521990952785'`; `DELETE` do contato telefônico na ficha do Hugo; `UPDATE profiles SET employee_status = 'desligado'` + `DELETE FROM user_roles` da conta `94809399...`.
- **Código**: pequeno ajuste em `supabase/functions/whatsapp-in/index.ts` (log/guarda de ambiguidade) + redeploy.
- **Segurança**: nenhuma política de RLS é alterada; a função já é `SECURITY DEFINER` e continua expondo apenas o necessário ao webhook.

## Validação
1. Enviar mensagem no WhatsApp → Marina deve tratar como **super admin** (perfil e permissões corretos).
2. `resolve_employee_by_phone('5521990952785')` deve retornar a conta super admin com `match_count = 1`.
3. Conta comercial consta como desligada na lista de usuários e sem papel.
