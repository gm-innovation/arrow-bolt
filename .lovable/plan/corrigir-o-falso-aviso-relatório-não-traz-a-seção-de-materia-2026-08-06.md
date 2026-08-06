# Corrigir o falso aviso "relatório não traz a seção de material fornecido"

O relatório traz a seção `F. MATERIAL FORNECIDO`, mas o painel exibe o alerta amarelo dizendo que ela não existe. Não é problema de dados: é o reconhecimento do título.

## Causa

O detector de seção aceita "MATERIAIS FORNECIDOS" (plural, com espaço antes de "fornecid") ou uma linha só "MATERIAL", mas **não** aceita o singular "MATERIAL FORNECIDO" — o padrão exige espaço logo após "materia/materiai", e no singular vem o "l". Verificado por teste direto do padrão: `MATERIAL FORNECIDO` → não reconhecido; `MATERIAIS FORNECIDOS` → reconhecido.

O cruzamento com o estoque (EVA) não passa por esse parser — ele usa os materiais extraídos pela IA, por isso a auditoria enxergou o conector e o cabo enquanto a tela dizia que não havia seção.

## Correção

Ampliar o reconhecimento do título para cobrir variações reais dos relatórios: singular e plural, com ou sem complemento, e sinônimos ("material fornecido", "materiais fornecidos", "material utilizado", "materiais aplicados", "material empregado", "material"). Manter o fallback pela letra da seção (F) quando o título vier vazio.

A mesma correção vale nos dois lugares que têm o parser duplicado, para que a auditoria no backend e a exibição no frontend concordem:

- `src/lib/auvo/reportSections.ts`
- `supabase/functions/auvo-sync/reportSections.ts`

Sem mudança de schema, RLS ou dados. Após ajustar, republicar a função `auvo-sync` para que o backend passe a considerar essas seções.

## Verificação

Testar o padrão contra os títulos reais existentes nos relatórios já importados e confirmar que o atendimento da imagem passa a mostrar a lista declarada ("1 Conector DB9 Fêmea completo.") em vez do alerta amarelo.
