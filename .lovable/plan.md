

## Correção: Ampliar dropdown de Supervisor/Coordenador

### Problema
Linhas 230-235 de `NewOrderForm.tsx` filtram apenas `role = 'coordinator'` para popular o dropdown de Supervisor. Leonardo tem role `technician`, então não aparece — mesmo sendo matched pelo backend.

### Correção

**Arquivo: `src/components/admin/orders/NewOrderForm.tsx`** (linhas 229-235)

Alterar a query para buscar todas as roles operacionais que podem atuar como supervisor numa OS:

```typescript
// Fetch user IDs with operational roles (any can be supervisor)
const { data: operationalRoles } = await supabase
  .from("user_roles")
  .select("user_id")
  .in("role", ["coordinator", "technician", "director", "super_admin"]);

const adminUserIds = [...new Set(operationalRoles?.map(r => r.user_id) || [])];
```

Isso **não muda** o papel de ninguém — coordenador continua sendo coordenador. Apenas permite que técnicos, diretores e outros colaboradores operacionais apareçam como opção nos campos Supervisor e Coordenador do formulário de OS.

### Resultado esperado
- Leonardo (technician) aparecerá no dropdown de Supervisor
- O import do Omie conseguirá vincular `matchedSupervisorId` automaticamente
- Roles permanecem inalteradas no banco

