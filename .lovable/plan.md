

## Plano: Corrigir busca de OSs do Omie

### Problema
A edge function `omie-proxy` envia parâmetros de paginação com nomes incorretos para a API do Omie. Está enviando `nPagina` e `nRegPorPagina`, mas a API do Omie para `ListarOS` espera `pagina` e `registros_por_pagina`.

Erro nos logs:
```
Tag [NPAGINA] não faz parte da estrutura do tipo complexo [osListarRequest]
```

### Correção
Alterar `handleListOrders` em `supabase/functions/omie-proxy/index.ts`:

**De:**
```typescript
const result = await callOmie("/servicos/os/", "ListarOS", {
  nPagina: page,
  nRegPorPagina: 50,
}, creds);
```

**Para:**
```typescript
const result = await callOmie("/servicos/os/", "ListarOS", {
  pagina: page,
  registros_por_pagina: 50,
  apenas_importado_api: "N",
}, creds);
```

Ajustar também os campos de retorno, pois a resposta usa `total_de_registros` e `total_de_paginas`:
```typescript
return {
  orders: result.osCadastro || [],
  total: result.total_de_registros || 0,
  pages: result.total_de_paginas || 0,
  current_page: page,
};
```

