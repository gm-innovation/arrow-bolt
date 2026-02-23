

## Redesign do Modal "Nova Entrada de Conhecimento"

O modal atual tem um layout simples de coluna unica. A referencia mostra um layout de 2 colunas com campos adicionais que nao existem no banco de dados atual.

---

### Campos do Modal (conforme imagem de referencia)

| Campo | Coluna | Tipo | Obrigatorio | Existe no BD |
|-------|--------|------|-------------|--------------|
| Titulo | Esquerda | Input | Sim | Sim (title) |
| Categoria | Esquerda | Select | Sim | Sim (category) |
| Segmento Alvo | Esquerda | Select | Nao | Nao |
| Prioridade | Esquerda | Select | Nao | Nao |
| Produto Relacionado | Esquerda | Select | Nao | Sim (product_id) |
| Conteudo | Direita | Textarea (alto) | Sim | Sim (content) |
| Tags | Direita | Input + botao "+" | Nao | Sim (tags) |
| Versao | Direita | Input | Nao | Nao |
| Observacoes | Direita | Textarea | Nao | Nao |

---

### Migracao de Banco

Adicionar 3 colunas a tabela `crm_knowledge_base`:
- `target_segment` (text, nullable, default 'todos') -- Segmento Alvo
- `priority` (text, nullable, default 'media') -- Prioridade
- `version` (text, nullable, default '1.0') -- Versao
- `notes` (text, nullable) -- Observacoes

---

### Layout do Modal

```text
+--------------------------------------------------+
| Nova Entrada de Conhecimento                  X  |
+------------------------+-------------------------+
| Titulo *               | Conteudo *              |
| [input wide]           | [textarea tall]         |
|                        |                         |
| Categoria *            |                         |
| [select]               |                         |
|                        |                         |
| Segmento Alvo          | Tags                    |
| [select: Todos/        | [input] [+]             |
|  Grande/Medio/Pequeno] |                         |
|                        | Versao                  |
| Prioridade             | [input: 1.0]            |
| [select: Alta/         |                         |
|  Media/Baixa]          | Observacoes             |
|                        | [textarea]              |
| Produto Relacionado    |                         |
| [select produtos]      |                         |
+------------------------+-------------------------+
|                     [Cancelar] [Criar Entrada]   |
+--------------------------------------------------+
```

- Largura do Dialog: `sm:max-w-2xl` para acomodar 2 colunas
- Grid: `grid grid-cols-2 gap-6`
- Conteudo (textarea): ocupa altura maior (rows=8)
- Tags: input com botao "+" ao lado para adicionar tags individualmente (lista de badges abaixo)
- Botao "Criar Entrada": estilo primario (roxo/primary)

---

### Alteracoes

| Tipo | Arquivo |
|------|---------|
| Migracao | Adicionar colunas target_segment, priority, version, notes |
| Modificar | `src/pages/commercial/admin/Knowledge.tsx` (redesign do dialog) |
| Modificar | `src/hooks/useKnowledgeBase.ts` (incluir novos campos no createArticle) |

