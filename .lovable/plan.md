

## Popular Departamentos e Membros no Banco

### Situação atual
- Tabela `departments`: **vazia**
- Tabela `department_members`: **vazia**
- Existem `corp_groups` com role_based já configurados (Administradores, Técnicos, RH, Gerentes, Comercial, Financeiro, Qualidade, Suprimentos)
- Existem 24 usuários com roles definidas na empresa `09a110b9-9f11-4b8d-a691-8b69f5f40a4e`

### Plano

1. **Seed de departamentos** — Inserir departamentos espelhando os grupos role-based existentes: Administração, Técnico, Recursos Humanos, Gerência, Comercial, Financeiro, Qualidade, Suprimentos.

2. **Seed de department_members** — Vincular cada usuário ao departamento correspondente à sua role (`user_roles.role` → departamento).

3. **Trigger automático** — Criar trigger `AFTER INSERT ON user_roles` que automaticamente insere o usuário no departamento correspondente, garantindo que novos usuários sejam vinculados sem intervenção manual.

4. **Corrigir `NewRequestDialog.tsx`** — Além das correções já pendentes (valor opcional, link em produtos, documentos), garantir que o select de destinatário funcione com os dados agora populados.

### Mapeamento role → departamento

```text
admin        → Administração
technician   → Técnico
hr           → Recursos Humanos
manager      → Gerência
commercial   → Comercial
financeiro   → Financeiro
qualidade    → Qualidade
compras      → Suprimentos
```

### Alterações

- **Migração SQL**: Trigger `auto_assign_department_on_role` + seed dos 8 departamentos + seed dos membros baseado em `user_roles`
- **`NewRequestDialog.tsx`**: Aplicar todas as correções pendentes (valor opcional, campo link em produtos, unificar contra-cheque/holerite, remover informe de rendimentos)

