

## Problema

A política de INSERT na tabela `notifications` só permite `admin` e `super_admin`. Coordenadores --- que são quem cria as OSs no dia a dia --- recebem erro 403 ao tentar notificar técnicos e supervisores.

## Correção

Uma migration SQL para atualizar a política, adicionando `coordinator` e `director`:

```sql
DROP POLICY "Admins can create notifications" ON public.notifications;

CREATE POLICY "Authorized roles can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'director'::app_role)
);
```

### Arquivo alterado
- 1 migration SQL (nenhuma alteração de código frontend)

### Resultado
- Coordenadores e diretores criam OS normalmente sem erro de notificação

