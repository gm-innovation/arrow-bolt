## Corrigir erro ao cadastrar embarcação (vessels)

### Diagnóstico

O toast mostra: `new row violates row-level security policy for table "vessels"`.

Ao inspecionar as políticas RLS da tabela `vessels`, existe apenas **uma política de escrita**, restrita à role `admin`:

```
"Admins can manage vessels in their company" — has_role(auth.uid(), 'admin')
```

Porém o usuário logado é **Coordenador**. Na tabela `clients` (irmã de `vessels`) existem políticas equivalentes para `coordinator` e `commercial`, mas em `vessels` essas políticas nunca foram criadas. Resultado: qualquer role diferente de `admin` (coordinator, commercial, director) não consegue cadastrar/editar/excluir embarcações, mesmo podendo editar o cliente dono delas.

### Correção

Migration SQL adicionando políticas `FOR ALL` na tabela `public.vessels` para as roles que já podem gerenciar `clients` na mesma empresa:

- **coordinator** — gerencia embarcações de clientes da própria empresa
- **commercial** — gerencia embarcações de clientes da própria empresa
- **director** — gerencia embarcações de clientes da própria empresa (consistente com a regra "Director full OS access")

Cada policy valida em `USING` e `WITH CHECK` que:
1. O `client_id` da embarcação pertence a um cliente da mesma `company_id` do usuário (via `user_company_id(auth.uid())`)
2. O usuário tem a role correspondente (via `has_role`)

A policy existente do admin permanece inalterada.

### Arquivos editados

1. **Nova migration SQL** — adiciona 3 políticas `FOR ALL` em `public.vessels` (coordinator, commercial, director)

### Validação

Após aplicar, o coordenador deve conseguir adicionar a embarcação "Rochedo de São Paulo" no cliente Oceanpact sem erro.
