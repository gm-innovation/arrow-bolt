

## Ajustes nos Modais de Produtos e Medicoes

Apos comparar os 4 screenshots com a implementacao atual:

---

### 1. Modal "Novo Produto/Servico" e "Editar Produto/Servico" (image-345, 346)

**Diferencas encontradas:**
- Referencia tem subtitulo descritivo ("Preencha as informacoes para adicionar um novo item ao catalogo" / "Atualize os detalhes do item")
- Categoria e um dropdown (manutencao, inspecao, etc.) em vez de input texto livre
- Referencia nao mostra toggle "Recorrente" -- apenas "Ativo no catalogo"
- Botao "Criar Item" / "Salvar Alteracoes" em vez de "Criar" / "Salvar"
- Labels com asterisco para campos obrigatorios (Nome*, Categoria*, Tipo*)

**Acoes em `src/pages/commercial/Products.tsx`:**
- Adicionar `DialogDescription` com subtitulo descritivo
- Trocar input de Categoria por Select dropdown com opcoes: manutencao, inspecao, comunicacao, navegacao, eletrica, mecanica, outros
- Marcar Categoria e Tipo como obrigatorios (asterisco + validacao)
- Renomear label "Ativo" para "Ativo no catalogo"
- Remover toggle "Recorrente" do modal (manter campo no banco para retrocompatibilidade)
- Alterar texto dos botoes para "Criar Item" / "Salvar Alteracoes"

---

### 2. Modal de Detalhes da Medicao (image-347, 348)

**Este modal nao existe.** A referencia mostra um dialog rico ao clicar no icone de "olho" na tabela de medicoes:

**Layout:**
- Titulo: "OS {numero} - {cliente}" com badge de status + "OS: {numero}"
- Botao "Reprocessar" no canto superior direito
- 3 cards informativos: Cliente (OS + nome), Valor Total (em verde), Data de Criacao
- 5 tabs: Materiais, Servicos, Horas, Viagens, Despesas (com contadores entre parenteses)
- Conteudo de cada tab e uma tabela readonly dos itens

**Acoes:**
- Criar componente `src/components/commercial/measurements/MeasurementDetailDialog.tsx`
- O dialog recebe um measurement ID, busca dados com related tables (measurement_materials, measurement_services, measurement_man_hours, measurement_travels, measurement_expenses)
- Adicionar coluna "Acoes" na tabela de Medicoes em `Measurements.tsx` com botoes de olho (ver detalhes) e sync (reprocessar)
- Conectar clique do olho ao dialog de detalhes

---

### Resumo

| Tipo | Arquivo |
|------|---------|
| Modificar | `src/pages/commercial/Products.tsx` (dialog layout, categoria dropdown, labels) |
| Criar | `src/components/commercial/measurements/MeasurementDetailDialog.tsx` (dialog de detalhes readonly) |
| Modificar | `src/pages/commercial/Measurements.tsx` (adicionar coluna Acoes + integrar dialog) |

### Detalhes Tecnicos

**MeasurementDetailDialog:** Usa query separada com `useMeasurements` pattern -- busca measurement por ID com joins em measurement_materials, measurement_services, measurement_man_hours, measurement_travels, measurement_expenses. Cada tab mostra tabela readonly com colunas conforme tipo (ex: Horas mostra Data, Periodo, Total Horas, Tipo, Categoria, Valor Total).

**Categorias do dropdown de Produtos:** manutencao, inspecao, comunicacao, navegacao, eletrica, mecanica, outros (baseado nos valores vistos na referencia).

