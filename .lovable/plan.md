

## Modal Dinâmico de Nova Solicitação

A infraestrutura de banco já existe (`dynamic_fields` nos tipos e `dynamic_data` nas solicitações). O plano é ativar esse sistema para que o formulário se adapte ao tipo selecionado.

### Fluxo do Modal
1. **Passo 1** — Seleção do tipo de solicitação (cards visuais com ícone e nome, em vez de dropdown)
2. **Passo 2** — Formulário dinâmico que varia conforme o tipo selecionado, com campos base (título, descrição, prioridade) + campos específicos renderizados a partir de `dynamic_fields`

### Campos Dinâmicos por Categoria (exemplos pré-configurados)
Cada tipo terá um `category` (novo campo) que determina campos contextuais automáticos:

| Categoria | Campos Específicos |
|---|---|
| `product` (Produto/Material) | Produto, Quantidade, Valor unitário, Justificativa |
| `subscription` (Assinatura) | Serviço/Plataforma, Valor mensal, Período, Justificativa |
| `document` (Documento) | Tipo de documento, Prazo desejado |
| `time_off` (Folga/Férias) | Data início, Data fim, Tipo (folga/férias/abono) |
| `general` (Geral) | Apenas os campos base |

### Alterações

1. **Migração SQL** — Adicionar coluna `category` (text, default `'general'`) na tabela `corp_request_types` para categorização rápida. Os `dynamic_fields` continuam disponíveis para campos personalizados adicionais.

2. **`src/components/corp/NewRequestDialog.tsx`** — Refatorar em duas etapas:
   - Etapa 1: Grid de seleção do tipo (cards com ícone por categoria)
   - Etapa 2: Formulário com campos base + campos dinâmicos renderizados conforme `category` e `dynamic_fields` do tipo. O título é auto-preenchido baseado no tipo.
   - Campos "Valor" e "Destinatário" aparecem apenas quando relevantes para a categoria
   - Salvar dados dos campos dinâmicos em `dynamic_data` da solicitação

3. **`src/pages/corp/admin/RequestTypes.tsx`** — Adicionar seletor de categoria ao criar/editar tipos, e opcionalmente editor de campos dinâmicos customizados.

4. **`src/hooks/useCorpRequestTypes.ts`** — Incluir `category` no tipo retornado (já vem automaticamente do select `*`).

5. **`src/components/corp/RequestDetailSheet.tsx`** — Exibir os `dynamic_data` formatados na visualização da solicitação.

