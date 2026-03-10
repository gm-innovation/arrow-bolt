

## Plano: Alterar Role do Usuário Diretor

### Problema
O usuário "Diretor" (`diretor@googlemarine.com.br`, ID `65ccda05-986a-483f-a9a3-cd6f0c9cb666`) está com role `manager` no banco. Precisa ser `director` para receber solicitações corporativas na aba "Recebidas".

### Alteração
Uma única operação de UPDATE no banco de dados:

```sql
UPDATE user_roles 
SET role = 'director' 
WHERE user_id = '65ccda05-986a-483f-a9a3-cd6f0c9cb666' 
  AND role = 'manager';
```

### Resultado
Após a alteração, ao fazer login com `diretor@googlemarine.com.br`:
- O usuário será redirecionado para `/corp/dashboard` (dashboard do diretor)
- Na página de Solicitações, a aba **"Recebidas"** mostrará solicitações com status `pending_director` para aprovação/rejeição

