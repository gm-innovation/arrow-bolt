# Consolidação de setores administrativos + setor Diretoria

## Contexto (confirmado no banco e no código)

Setor e perfil são coisas diferentes no Arrow: **perfil** controla acesso às áreas; **setor** é a unidade organizacional (roteamento de documentos, solicitações, feed, RH). O vínculo automático papel → setor ficou inconsistente:

- `admin` → Administração, `manager` → Gerência (papéis legados), `coordinator` → **nenhum setor** (bug: o setor Coordenação existe mas ninguém é alocado).
- `director` e `super_admin` → nenhum setor (não existe "Diretoria").
- Nenhum nome de setor está fixo no código do frontend/backend — tudo é dinâmico, então a consolidação é segura.

## Decisões do usuário

1. **Consolidar** Administração, Gerência e Coordenação em um único setor: **Coordenação**.
2. **Criar "Diretoria"** apenas para o papel `director` (super admin fica sem setor — é perfil técnico da plataforma).

## Migration única

1. **Criar setores faltantes** (idempotente, por empresa): garante "Coordenação" e "Diretoria" em todas as empresas.
2. **Migrar membros**: quem está em Administração ou Gerência passa para Coordenação (`department_members`, sem duplicar); remover os vínculos antigos.
3. **Reapontar referências** dos setores antigos para Coordenação em todas as tabelas com FK para `departments` (`profiles.department_id`, `corp_request_types.department_id`, `corp_documents.department_id` e demais que existirem).
4. **Remover** os setores "Administração" e "Gerência" após o reapontamento (não há histórico preso ao ID do setor além dessas referências).
5. **Backfill por papel**: usuários com `coordinator`, `admin` ou `manager` entram em Coordenação; usuários com `director` entram em Diretoria.
6. **Atualizar `auto_assign_department_on_role`**: `coordinator`/`admin`/`manager` → Coordenação; `director` → Diretoria; demais papéis mantidos; `super_admin` → sem setor.
7. **Atualizar `seed_default_departments`**: novas empresas passam a nascer com Coordenação e Diretoria (sem Administração/Gerência).

## Verificação

- Conferir no banco: ninguém mais vinculado a Administração/Gerência; diretores em Diretoria; coordenadores/admins/gerentes em Coordenação.
- Testar no preview: dropdown de Setor (novo usuário, filtros de RH, roteamento de solicitações) mostra Coordenação e Diretoria; troca de papel de um usuário realoca o setor automaticamente.
- Confirmar que a Marina (ferramenta de solicitações por `department_name`) resolve "Coordenação" e "Diretoria".

## Notas técnicas

- Tudo em uma migration: sem tabela nova, então não exige GRANT/RLS adicionais — apenas dados + duas funções (`CREATE OR REPLACE`).
- Migração de membros com `ON CONFLICT DO NOTHING` para não violar a unicidade de `department_members`.
- Setores criados manualmente pelas empresas (Engenharia, Laboratório, Recepção etc.) não são tocados.
