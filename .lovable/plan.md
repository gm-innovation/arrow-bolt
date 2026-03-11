

## Plano: Corrigir constraint para sincronização Omie funcionar

### Problema
O índice único criado é **parcial** (`WHERE omie_client_id IS NOT NULL`), e o PostgreSQL não aceita índices parciais para resolver `ON CONFLICT`. Resultado: todas as 26 páginas falharam com 0 clientes sincronizados.

O toggle de sincronização **já está funcionando** corretamente (`omie_sync_enabled = true`).

### Solução
Uma migração SQL para:
1. Remover o índice parcial existente
2. Criar uma **UNIQUE CONSTRAINT** real (não parcial) em `(company_id, omie_client_id)`

```sql
DROP INDEX IF EXISTS idx_clients_company_omie;
ALTER TABLE public.clients 
  ADD CONSTRAINT uq_clients_company_omie 
  UNIQUE (company_id, omie_client_id);
```

### Impacto
- Uma migração apenas, sem alterações em código
- Após aplicar, basta clicar "Sincronizar Clientes Agora" novamente para importar os 2558 clientes

