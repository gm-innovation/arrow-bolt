## Correção

Dois ajustes complementares para permitir que diretores/coordenadores/RH também contribuam com conhecimento em agentes globais:

### 1) Frontend — `src/components/super-admin/ai/TrainingTab.tsx`

Ao inserir em `ai_knowledge_sources` e `ai_training_examples`, usar o `company_id` do próprio usuário quando o agente for global:

- Carregar o `company_id` do perfil do usuário logado (via `profiles`) uma vez no hook.
- No `uploadFile.mutationFn` e `addManual.mutationFn`, gravar `company_id: agent.company_id ?? profile.company_id`.
- Mesma alteração em `addExample.mutationFn`.

Isso satisfaz a policy `ai_knowledge_sources company managers` (`company_id = user_company_id(auth.uid())`) sem precisar afrouxar RLS.

### 2) Storage — bucket `ai-knowledge`

Verificar as policies do bucket `ai-knowledge` no `storage.objects`. Se o upload também estiver restrito a `super_admin`, adicionar policy que permita `director`, `coordinator` e `hr` fazerem `INSERT`/`SELECT` em objetos cujo `bucket_id = 'ai-knowledge'`.

Se as policies já cobrem esses papéis, este passo é dispensado — o insert na tabela é a causa raiz do erro exibido.

### 3) Filtragem de escopo (já implementada) permanece intacta

O `scope` continua sendo salvo normalmente; a mudança é só no `company_id`.

## Arquivos afetados

- `src/components/super-admin/ai/TrainingTab.tsx` — buscar `company_id` do usuário e usar no insert.
- Migração SQL (só se o bucket `ai-knowledge` bloquear o upload para os papéis operacionais).

## Verificação

Após a mudança:
- Diretor consegue enviar PDF/DOCX e adicionar texto manual em agente global.
- Super admin continua funcionando.
- Registros ficam vinculados ao `company_id` do autor, respeitando a RLS.