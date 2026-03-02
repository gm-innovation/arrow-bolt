

## Correção: Botão de voltar na página de Grupo

O botão "← Grupos" em `src/pages/corp/GroupDetail.tsx` (linha 63-64) navega para `/corp/groups`, que foi removido. Deve ser alterado para:
- Texto: "Feed" em vez de "Grupos"
- Destino: `/corp/feed` em vez de `/corp/groups`

### Arquivo alterado
- `src/pages/corp/GroupDetail.tsx` — linha 63-64: trocar label e rota

