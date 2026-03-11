

## Plano: Simplificar importação — buscar OS direta por número

### Problema atual
O modal de importação tenta listar todas as OSs do Omie (paginando centenas de registros), o que causa rate-limit (`REDUNDANT`) e falhas constantes. O usuário já sabe qual OS quer importar.

### Solução
Substituir a listagem massiva por uma busca direta: o usuário digita o número da OS e o sistema consulta apenas aquela OS específica via `ConsultarOS`.

### Alterações

**1. Backend (`supabase/functions/omie-proxy/index.ts`)**
- Remover `handleListOrders` e `handleSearchOrders` (varredura paginada)
- Manter apenas `handleConsultOrder` que já usa `ConsultarOS` (consulta direta por `nCodOS` ou `cNumOS`)
- Ajustar para aceitar busca por `cNumOS` (número textual da OS) além de `nCodOS`

**2. Hook (`src/hooks/useOmieIntegration.ts`)**
- Remover mutations `listOrders` e `searchOrders`
- Manter `consultOrder` como único método de busca de OS

**3. Modal de importação (`src/components/admin/orders/OmieImportDialog.tsx`)**
- Redesenhar: campo de texto "Digite o número da OS" + botão "Buscar"
- Ao buscar, chama `consultOrder` com o número informado
- Se encontrar, exibe os dados da OS e botão "Importar esta OS"
- Se não encontrar, mensagem clara de erro
- Sem listagem inicial, sem paginação, sem scroll de centenas de itens
- Uma única chamada à API do Omie por busca = sem rate-limit

### Fluxo simplificado
```text
[Usuário digita "12345"] → [Botão Buscar] → ConsultarOS(cNumOS: "12345")
                                                   ↓
                                          [Exibe dados da OS]
                                                   ↓
                                         [Botão "Importar esta OS"]
```

