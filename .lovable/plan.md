# Corrigir auditoria de materiais inline do Auvo

## Diagnóstico confirmado

- A OS 4542 possui dois atendimentos; o relatório de Carlos contém `F) 02 kits de Overhaull`.
- O parser atual reconhece `F)` como seção, mas armazena `02 kits de Overhaull` no campo de título e deixa o corpo vazio.
- A regra atual considera a seção F como material apenas quando o título está vazio. Assim, nenhum registro foi criado em `auvo_report_materials` e o `KIT OVERHAUL STD22` ficou salvo como “Baixado do estoque, sem relato”.
- A auditoria exibida foi calculada em 10/08/2026 com quantidade de estoque 1 e quantidade relatada nula; portanto, além da correção do código, a OS precisa ser reanalisada.

## Implementação

1. **Corrigir os dois parsers equivalentes**
   - No backend e no frontend, considerar toda seção `F)` como campo de material.
   - Quando `F)` trouxer o conteúdo na mesma linha, incorporar esse texto ao corpo auditável.
   - Preservar cabeçalhos explícitos como `F) MATERIAL FORNECIDO`, usando apenas o conteúdo abaixo deles.
   - Continuar tratando `F) N/A`, `F) Na.` e equivalentes como ausência de material.

2. **Fortalecer a extração e o cruzamento**
   - Garantir que `02 kits de Overhaull` seja enviado à extração como quantidade 2.
   - Confirmar o casamento com `KIT OVERHAUL STD22`, tolerando a grafia “Overhaull”.
   - Manter a soma de menções do mesmo produto em múltiplos blocos e múltiplos relatórios do mesmo serviço.

3. **Adicionar testes de regressão**
   - Cobrir conteúdo inline: `F) 02 kits de Overhaull`.
   - Cobrir conteúdo na linha seguinte e cabeçalho explícito de material.
   - Cobrir `F) Na.` e múltiplos blocos A–F no mesmo relatório.
   - Cobrir o cruzamento em que estoque registra 1 e relatório declara 2, que deve resultar em correspondência sem risco — não “sem relato”.

4. **Atualizar o resultado existente**
   - Publicar a função de auditoria corrigida.
   - Reanalisar especificamente o grupo da OS 4542.
   - Verificar no banco que o material extraído ficou com quantidade 2 e que a divergência crítica anterior foi substituída por correspondência sem risco.

5. **Validar a interface**
   - Abrir novamente a revisão da OS 4542.
   - Confirmar que “Material fornecido” mostra `02 kits de Overhaull` e que o card exibe baixa 1, relatado 2 e risco zero.
   - Confirmar que o segundo atendimento, sem relatório, continua identificado separadamente e não apaga o material declarado no primeiro.

## Arquivos principais

- `supabase/functions/auvo-sync/reportSections.ts`
- `supabase/functions/auvo-sync/crosscheck.ts`
- `src/lib/auvo/reportSections.ts`
- Testes da função `auvo-sync`

## Banco de dados

Não é necessária alteração de estrutura ou de RLS. Apenas a reanálise substituirá os dados derivados incorretos da OS 4542.