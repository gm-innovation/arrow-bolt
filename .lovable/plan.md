

## Criar Grupos Padrão Automaticamente

A migração anterior criou a tabela `corp_groups` mas não populou com grupos automáticos baseados nas funções (roles) existentes.

### O que fazer

Inserir grupos `role_based` para cada role existente na empresa **Googlemarine Eletrônica Naval** (`09a110b9-...`), usando as roles já cadastradas no sistema:

| Role | Nome do Grupo |
|------|--------------|
| technician | Técnicos |
| admin | Administradores |
| hr | Recursos Humanos |
| manager | Gerentes |
| commercial | Comercial |
| qualidade | Qualidade |
| financeiro | Financeiro |
| compras | Suprimentos |

Além disso, criar grupos de trabalho padrão comuns em empresas:
- **CIPA** (Comissão Interna de Prevenção de Acidentes)
- **Brigada de Incêndio**
- **SESMT** (Serviço Especializado em Segurança)

### Alterações

1. **SQL INSERT** (via insert tool) — Inserir 11 grupos na tabela `corp_groups` para a empresa existente
2. **SQL INSERT** — Auto-associar membros aos grupos `role_based` baseado na tabela `user_roles` + `profiles`
3. **Migração SQL** — Criar trigger para auto-inserir grupos role_based quando nova empresa for criada, e auto-associar usuários quando receberem uma role

