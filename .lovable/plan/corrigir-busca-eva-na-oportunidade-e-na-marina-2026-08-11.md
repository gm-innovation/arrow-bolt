# Corrigir busca EVA na oportunidade e na Marina

## Diagnóstico confirmado

- O campo de produtos está dentro de um `Sheet`, mas a lista é aberta por um `Popover` modal em outro portal. Essa combinação mantém a lista visível, porém disputa o foco com o painel lateral e impede a digitação de forma confiável.
- A Marina possui a ferramenta `query_stock_products` para o perfil comercial, mas o modelo pode responder sem chamá-la. As conversas registradas mostram respostas negativas sem evidência de consulta, enquanto o endpoint EVA retornou o catálogo em chamadas recentes.
- O espelho local não contém itens com “overhaul”; portanto ele não resolve essa busca quando a API externa falha.

## Implementação

1. **Substituir o seletor problemático na oportunidade**
   - Remover o `Popover`/`CommandInput` do formulário de produto.
   - Usar um campo `Input` normal, dentro do próprio `Sheet`, com lista rolável de resultados logo abaixo.
   - Preservar seleção, preço sugerido, quantidade, valor negociado e vínculo do item à oportunidade.

2. **Obrigar consulta ao EVA para perguntas de estoque**
   - Detectar perguntas sobre produto, código, NCM, preço ou disponibilidade e também continuações como “pesquise novamente”.
   - Executar `query_stock_products` antes da resposta da Marina e fornecer o retorno real ao modelo.
   - Reutilizar o termo da pergunta anterior quando a mensagem atual for apenas uma continuação.
   - Não permitir que a Marina diga “não encontrei” quando a ferramenta retornar itens.

3. **Fortalecer a busca e o modo degradado**
   - Manter retry da API EVA.
   - Normalizar termos com acentos e palavras compostas.
   - Quando a API estiver indisponível, deixar explícito que o resultado vem do espelho local e pode estar incompleto, em vez de apresentar ausência como fato definitivo.

4. **Validar o fluxo completo**
   - Abrir uma oportunidade e confirmar que é possível digitar livremente, filtrar e selecionar um produto.
   - Testar a Marina com “temos kit de overhaul no estoque?” e depois “pode pesquisar novamente?”.
   - Conferir logs da função para provar que a ferramenta EVA foi realmente executada e que a resposta corresponde aos itens retornados.

## Arquivos principais

- `src/components/commercial/opportunities/OpportunityProductsTab.tsx`
- `supabase/functions/ai-assistant/index.ts`
- `supabase/functions/ai-assistant/tools.ts`
- `supabase/functions/_shared/eva-products.ts`
