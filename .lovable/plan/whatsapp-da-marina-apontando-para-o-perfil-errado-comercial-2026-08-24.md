# WhatsApp da Marina apontando para o perfil errado (comercial em vez de super admin)

## Diagnóstico confirmado (dados reais)

1. **Vínculo errado**: o número `5521990952785` está ligado em `channel_identities` ao usuário `94809399...` — "HUGO ALEXANDRE SANTOS SILVA" (papel **commercial**). A conta super admin é outra: `e9ebd707...` — "Alexandre Silva" (papel **super_admin**).
2. **Causa raiz**: a função `resolve_employee_by_phone` monta candidatos de `profiles.phone` **e** de `hr_employee_contacts` e, em empate, escolhe por `ORDER BY full_name LIMIT 1` — critério arbitrário. O telefone `21990952785` existe nos dois lugares (perfil do Alexandre + contato de RH da ficha do Hugo), então o pareamento caiu na conta errada.
3. **Decisão do usuário**: as **duas contas continuam ativas**; apenas o WhatsApp passa a responder como a conta **super admin**.

## O que será feito

### 1. Função `resolve_employee_by_phone` com prioridade (migration)
- Candidatos passam a ter fonte rankeada: **1º `profiles.phone`** (cadastro principal), **2º `hr_employee_contacts`** (telefone/celular/whatsapp).
- Desempate seguinte: colaborador com `employee_status` ativo primeiro; por fim nome.
- Mantém `match_count` no retorno para o webhook saber quando houve ambiguidade.
- Resultado prático: com o telefone nas duas contas, a resolução passa a cair sempre na conta que tem o número no **perfil** (a super admin).

### 2. Correção do vínculo atual (mudança de dados)
- **`channel_identities`**: o vínculo do número `5521990952785` passa a apontar para a conta super admin (`e9ebd707...`). Na próxima mensagem a Marina já fala com o perfil e as permissões certas.
- Nada é desativado nem excluído: conta comercial, papéis, contatos de RH e histórico permanecem intactos.

### 3. Webhook `whatsapp-in`: guarda de ambiguidade (código)
- Quando `match_count > 1`, registrar log com os candidatos para auditoria.
- Se nenhum candidato estiver ativo, não auto-vincular — responde pedindo para falar com o RH em vez de vincular na conta errada.

## Fora de escopo
- Não muda o fluxo de pareamento por código, nem contas, papéis ou cadastro de contatos do RH.

## Detalhes técnicos
- **Migration**: `CREATE OR REPLACE FUNCTION public.resolve_employee_by_phone(text)` com `src_rank` na CTE de candidatos e `ORDER BY src_rank, (estatus = 'ativo') DESC, fname`.
- **Dados**: `UPDATE channel_identities SET user_id = 'e9ebd707-2fdd-4636-b715-78691a1121a8' WHERE channel = 'whatsapp' AND external_id = '5521990952785'`.
- **Código**: pequeno ajuste em `supabase/functions/whatsapp-in/index.ts` (log/guarda de ambiguidade) + redeploy.
- **Segurança**: nenhuma política de RLS é alterada; a função continua expondo apenas o necessário ao webhook.

## Validação
1. `resolve_employee_by_phone` para o número deve retornar a conta super admin.
2. Enviar mensagem no WhatsApp → Marina trata como **super admin** (perfil e ferramentas corretos).
3. Conta comercial continua ativa e intacta.
