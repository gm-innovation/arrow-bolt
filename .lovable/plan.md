
Objetivo: resolver definitivamente a importação de OS do Omie que ainda aparece como “Nenhuma OS encontrada”.

Diagnóstico (com base no código + logs):
- O backend está retornando erro de consumo redundante do Omie (`REDUNDANT`, aguardar 10s).
- A UI hoje “engole” esse erro (`catch {}`) e mostra vazio, então parece que não existe OS.
- O modal carrega só a página 1 e filtra localmente; se a OS estiver em outra página, a busca não encontra.
- Há também um bug latentente no proxy: `handleConsultOrder` e `handleAttachFile` chamam `callOmie` sem `creds`.

Do I know what the issue is? Sim: é uma combinação de (1) erro de rate/consumo redundante + (2) tratamento de erro silencioso no front + (3) busca limitada à primeira página.

Plano de implementação:

1) Fortalecer o backend de Omie
- Arquivo: `supabase/functions/omie-proxy/index.ts`
- Adicionar retry automático para erro `REDUNDANT` (espera ~10s, 1 nova tentativa).
- Ajustar listagem para `registros_por_pagina: 100` (máximo recomendado) para reduzir paginação.
- Criar ação nova `search_orders` que pagina no backend e retorna matches por:
  - `Cabecalho.cNumOS`
  - `Cabecalho.nCodOS`
  - `InformacoesAdicionais.cNomeCliente`
- Corrigir chamadas de `handleConsultOrder` e `handleAttachFile` para passar `creds`.

2) Expor a busca nova no hook
- Arquivo: `src/hooks/useOmieIntegration.ts`
- Adicionar mutation `searchOrders` (ação `search_orders`).
- Incluir `onError` com toast para `listOrders` e `searchOrders` (sem falha silenciosa).

3) Corrigir UX do modal de importação
- Arquivo: `src/components/admin/orders/OmieImportDialog.tsx`
- Remover `catch` silencioso e exibir estado de erro real no modal.
- Evitar chamadas repetidas enquanto `loading` (bloqueio de reentrância).
- Busca “real” no Omie ao confirmar pesquisa (Enter/botão), em vez de apenas filtro local.
- Manter a lista inicial (página 1) para navegação rápida, mas usar busca remota para OS fora da página carregada.
- Ajustar feedback visual:
  - loading de busca
  - “Nenhuma OS encontrada” apenas quando a consulta conclui sem resultados
  - mensagem específica quando houver erro de consumo/rate limit.

4) Validação de ponta a ponta
- Cenário A: abrir modal e listar OS recentes.
- Cenário B: buscar uma OS conhecida que não esteja na primeira página.
- Cenário C: clicar recarregar rapidamente e validar que não quebra (retry/backoff + mensagem correta).
- Cenário D: confirmar seleção de OS preenchendo `orderNumber` no formulário.

Detalhes técnicos (resumo):
- Backend terá estratégia de retry controlado para `REDUNDANT` e busca paginada server-side.
- Frontend deixa de interpretar erro como lista vazia.
- Busca deixa de depender apenas da página 1, que é a principal limitação atual.
