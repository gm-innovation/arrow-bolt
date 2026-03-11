

## Plano: Enriquecer dados da OS com cliente local

### Problema
Ao consultar uma OS no Omie, o campo `InformacoesAdicionais.cNomeCliente` vem vazio, resultando em "Não identificado". Porém o `nCodCli` (código do cliente no Omie) está presente na resposta, e o cliente já existe no sistema local com `omie_client_id` correspondente.

### Solução
No backend (`handleConsultOrder`), após buscar a OS no Omie, usar o `nCodCli` retornado para consultar a tabela `clients` local pelo campo `omie_client_id` e enriquecer a resposta com o nome do cliente do sistema.

### Alterações

**1. Backend (`supabase/functions/omie-proxy/index.ts`)**
- `handleConsultOrder` passa a receber `supabaseAdmin` e `companyId`
- Após obter a OS do Omie, extrai `Cabecalho.nCodCli`
- Consulta `clients` onde `omie_client_id = nCodCli AND company_id = companyId`
- Retorna os dados originais do Omie + campo extra `localClient` com `{ id, name }` do sistema local
- No switch/case, passa `supabaseAdmin` e `companyId` para a função

**2. Frontend (`OmieImportDialog.tsx`)**
- Ao exibir o cliente, prioriza `foundOrder.localClient?.name` sobre `info.cNomeCliente`
- Se encontrou match local, mostra badge "Cliente vinculado" em verde
- Ao importar, passa também o `localClient.id` para vincular diretamente a OS ao cliente correto

