

## Diagnóstico: Por que só o cliente é preenchido

### Problemas identificados

**1. `omie-proxy` não está registrada no `config.toml`**
A função não tem entrada no `config.toml`, o que pode impedir o deploy correto. Precisa ser adicionada.

**2. A extração de `serviceDescription` pode estar vazia**
O campo `ServicosPrestados[].cDescricao` pode não ser o nome correto do campo retornado pela API Omie — o Omie usa variações como `cDescrServico`, `cDescricao`, `descricao`. Se estiver vazio, a IA nunca é chamada e `parsedData` fica `{}`.

**3. Race condition no `useEffect` de import**
O `useEffect` de import roda potencialmente antes do `fetchInitialData` terminar. Quando `form.setValue("clientId", ...)` é chamado, o watcher de `selectedClient` dispara `fetchVessels` de forma assíncrona. O `setTimeout(1200ms)` é frágil — se a busca demorar mais, o vessel/requester não são setados porque as listas ainda estão vazias.

**4. Falta de logs de diagnóstico**
Não há console.log no fluxo para identificar o que está chegando da API Omie e o que a IA retorna.

### Plano de correção

**1. Adicionar `omie-proxy` ao `config.toml`**
```toml
[functions.omie-proxy]
verify_jwt = true
```

**2. Melhorar extração de `serviceDescription` no backend**
- Adicionar logs extensivos: dados brutos do Omie, descrição extraída, resposta da IA
- Buscar o campo correto em `ServicosPrestados` — verificar também `cDescrServico` e campos aninhados
- Logar a resposta completa da IA para diagnóstico

**3. Corrigir race condition no frontend**
Substituir o `setTimeout(1200ms)` por uma abordagem reativa:
- Guardar os dados pendentes do Omie em um ref
- Quando `vessels` e `clientContacts` terminarem de carregar (via `useEffect` que observa esses states), aplicar os valores pendentes
- Isso garante que vessel, requester etc. só são setados quando as listas estiverem prontas

**4. Adicionar campo `Observações` / `InformacoesAdicionais` como fallback**
A descrição pode estar em `InformacoesAdicionais.cDadosAdicionaisNF` ou `Observacoes.cObsOS`. Incluir esses campos como fontes alternativas de texto.

### Alterações por arquivo

**`supabase/config.toml`** — Adicionar entrada para `omie-proxy`

**`supabase/functions/omie-proxy/index.ts`**
- Adicionar `console.log` detalhados em `handleConsultOrder` (dados brutos, descrição, resposta IA)
- Expandir extração de `serviceDescription` para buscar em múltiplos campos do Omie
- Logar estrutura completa de `ServicosPrestados` para debug

**`src/components/admin/orders/NewOrderForm.tsx`**
- Substituir `setTimeout(1200ms)` por `useEffect` reativo que observa `vessels` e `clientContacts`
- Quando esses arrays carregam E existem dados pendentes do Omie, aplicar os valores
- Adicionar `console.log` no import para debug frontend

