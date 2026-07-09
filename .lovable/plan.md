## Diagnóstico

### 1. Alterar senha — já implementado, precisa de validação
- `src/pages/account/AccountSettings.tsx` (aba **Segurança**) chama `updatePassword(newPassword)` do `AuthContext`.
- `AuthContext.updatePassword` executa `supabase.auth.updateUser({ password })` — chamada correta e suportada pela Lovable Cloud.
- Não há bug de código. Apenas confirmar em teste ao vivo (login com usuário, mudar senha, deslogar, logar com a nova senha).

### 2. Notificação "Novo currículo recebido" chegou para Comercial/Marketing
- O trigger `notify_hr_on_new_application` (migration `20260512201814_...sql`) já filtra corretamente: só notifica usuários com role `hr` ou `director` da mesma empresa.
- Consulta ao banco confirma: a notificação de "CAHUA ARAUJO FERNANDES" foi criada em **18/05/2026** — data em que ela ainda tinha o papel `hr`. Depois o papel foi trocado para `marketing` (+ espelho `commercial`), mas a notificação antiga permaneceu na caixa dela.
- Ou seja: **não é bug do trigger**, é sujeira histórica de notificações criadas antes da troca de papel.

## Correções

### Migration (dados) — limpeza de notificações órfãs
Excluir notificações com título `Novo currículo recebido` cujo destinatário não tem mais `hr` nem `director` hoje:
```sql
DELETE FROM public.notifications n
WHERE n.title = 'Novo currículo recebido'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = n.user_id
      AND ur.role IN ('hr','director')
  );
```

### Reforço no trigger (defesa em profundidade)
Reescrever `notify_hr_on_new_application` para excluir explicitamente quem tenha `commercial` ou `marketing` como papel "operacional" e ainda tenha `hr`/`director` (não deveria acontecer, mas garante) — na prática o filtro atual já basta; então **apenas adicionamos um comentário**. Não vamos mexer no trigger fora do necessário.

Se preferir, dá para adicionar uma cláusula extra `AND NOT EXISTS (marketing role)` — mas isso mudaria semântica caso um Diretor também acumule Marketing. Melhor manter simples e só limpar o histórico.

### Validação do fluxo de alterar senha
1. Login como usuário Comercial/Marketing.
2. Ir em Settings → Segurança.
3. Definir nova senha (8+ chars) → clicar "Salvar nova senha".
4. Toast "Senha alterada com sucesso".
5. Logout → login com a nova senha.

Sem alterações de frontend.