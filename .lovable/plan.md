

## Plano: Remover validação de data passada + Remover "(Opcional)" dos labels

### Alterações em `src/components/admin/orders/NewOrderForm.tsx`

1. **Remover `.refine()` de data passada** (linhas 26-31): manter apenas `.min(1, ...)` no campo `serviceDateTime`

2. **Remover "(Opcional)" dos labels**:
   - Linha 787: `Solicitante (Opcional)` → `Solicitante`
   - Linha 826: `Supervisor (Opcional)` → `Supervisor`
   - Linha 851: `Coordenador (Opcional)` → `Coordenador`

