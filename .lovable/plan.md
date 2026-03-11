

## Diagnóstico

Investiguei a fundo os dados da OS 1236 e encontrei a causa raiz:

### Os dados salvos estão errados no banco
- A tabela `visit_technicians` tem 2 registros, mas **ambos com `technician_id = NULL`** e ambos com `is_lead = true`
- As 6 tasks criadas também têm `assigned_to = NULL`
- Ou seja: os técnicos selecionados na UI **não foram persistidos** corretamente

### "Hugo Alexandre" não existe no sistema
Verifiquei todos os técnicos cadastrados e **não existe nenhum usuário chamado "Hugo Alexandre"**. Os técnicos com "Alexandre" no nome são:
- **ALEXANDRE STARCK DE OLIVEIRA**
- **ALEXSANDRO DE ARAUJO CALHEIROS**

Se "Hugo Alexandre" é uma pessoa real que deveria estar no sistema, ele precisa ser cadastrado primeiro.

### Causa provável dos dados NULL
O `technician_id` na tabela `visit_technicians` é **nullable** (permite NULL). Quando a inserção aconteceu sob as restrições de RLS anteriores, os valores dos IDs dos técnicos podem ter sido descartados ou o estado do formulário foi resetado antes do submit completar, resultando em `undefined` no JavaScript → `NULL` no banco.

## Correção proposta

### 1. Tornar `technician_id` NOT NULL na tabela `visit_technicians`
Isso impede que registros com técnico vazio sejam salvos. Se o insert falhar, o erro será visível.

```sql
-- Remove registros inválidos com technician_id NULL
DELETE FROM visit_technicians WHERE technician_id IS NULL;

-- Torna a coluna obrigatória
ALTER TABLE visit_technicians ALTER COLUMN technician_id SET NOT NULL;
```

### 2. Adicionar validação no frontend antes do insert
No `NewOrderForm.tsx`, filtrar valores undefined/null antes de inserir:

```typescript
const validTechnicians = selectedTechnicians.filter(id => id && id.trim() !== '');
if (validTechnicians.length === 0) {
  throw new Error("Selecione pelo menos um técnico");
}
```

### 3. Corrigir a OS 1236 manualmente
Os dados da OS 1236 precisam ser corrigidos — deletar os visit_technicians com NULL e as tasks sem assigned_to, para que possam ser recriados via edição da OS.

### Arquivos a alterar
- **1 migration SQL** — NOT NULL + limpeza de dados inválidos
- **`NewOrderForm.tsx`** — validação de IDs antes do insert (criação e edição)

### Resultado esperado
- Impossível salvar técnicos com ID nulo
- Erros de dados ficam visíveis ao invés de silenciosos
- OS futura sempre terá técnicos corretamente vinculados

