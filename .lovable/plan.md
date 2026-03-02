

## Reordenar tipos de solicitação no dropdown

Adicionar um mapa de ordenação por categoria e ordenar `activeTypes` antes de renderizar:

**`NewRequestDialog.tsx`** (linha ~87):
- Criar constante `CATEGORY_ORDER` com a sequência desejada: `product` → `document` → `reimbursement` → `time_off` → `subscription` → `general`
- Ordenar `activeTypes` usando `.sort()` baseado nesse mapa

Sequência final no dropdown:
1. Produto / Material
2. Documento
3. Reembolso
4. Folga / Férias
5. Assinatura / Software
6. Geral

