
# Fix — permitir Master da Qualidade no seeding de S&S

## Diagnóstico
O usuário logado (Silvia Silva) tem `role = 'qualidade'` (Master da Qualidade). A função `quality_seed_safety_document_types` só autoriza `super_admin`, `director` e `coordinator`, então retorna `insufficient_privileges`.

Em todo o módulo de Qualidade quem opera o GED é o Master da Qualidade (papel `qualidade`) — o mesmo papel já cria/aprova documentos. Deve poder cadastrar os tipos padrão.

## Mudança

**Migration única — substituir a função `quality_seed_safety_document_types`** acrescentando `qualidade` à lista de papéis autorizados:

```sql
v_allowed := public.has_role(v_uid, 'super_admin'::app_role)
          OR public.has_role(v_uid, 'director'::app_role)
          OR public.has_role(v_uid, 'coordinator'::app_role)
          OR public.has_role(v_uid, 'qualidade'::app_role);
```

Demais comportamentos preservados: `SECURITY DEFINER`, `search_path = public`, validação de `company_id` via `profiles` (com bypass para super_admin), `ON CONFLICT DO NOTHING`, GRANT EXECUTE para `authenticated`.

Nenhuma alteração de frontend é necessária — o botão "Cadastrar tipos" voltará a funcionar para o Master da Qualidade.
