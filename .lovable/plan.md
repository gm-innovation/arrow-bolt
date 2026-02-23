

## Ajustes nos Modais do Modulo Comercial

Apos comparar os 10 screenshots de referencia com a implementacao atual, identifiquei as seguintes diferencas:

---

### 1. Modal "Adicionar Novo Cliente" (image-335)

**Diferencas encontradas:**
- Referencia divide endereco em campos separados: CEP, Logradouro, N, Cidade, UF. Atualmente temos um unico campo "Endereco"
- Referencia tem secao "Comprador Principal" embutida (Nome, Cargo, E-mail, Telefone)
- Referencia tem segmentos diferentes: "Medio" como dropdown (parece ser porte), nao segmento de mercado
- Referencia tem 3 botoes: "Cancelar", "Criar e Voltar", "Criar e Abrir Perfil"
- Titulo: "Adicionar Novo Cliente" com subtitulo descritivo
- Campos "Razao Social" em vez de "Nome"

**Acoes:**
- **Migracao:** Adicionar colunas `cep`, `street`, `street_number`, `city`, `state` na tabela `clients` (manter `address` para retrocompatibilidade)
- **Migracao:** Adicionar colunas `is_active` e `is_primary` na tabela `crm_buyers`
- **Migracao:** Adicionar coluna `advance_notice_days` (integer, default 30) na tabela `crm_client_recurrences`
- Reescrever `NewClientDialog.tsx` com layout em 2 colunas: secao "Identificacao" (Razao Social, CNPJ, Segmento, Observacoes) e secao "Endereco" (CEP, Logradouro, N, Cidade, UF)
- Adicionar secao "Comprador Principal" ao final do modal (Nome, Cargo, E-mail, Telefone) -- ao salvar cliente, criar automaticamente um buyer associado
- Alterar botoes para "Cancelar", "Criar e Voltar", "Criar e Abrir Perfil"
- Adicionar subtitulo descritivo no DialogHeader

---

### 2. Painel Lateral de Detalhes do Cliente (image-336)

**Status:** Nao existe atualmente. Este e um recurso complexo (painel lateral com KPIs, tabs, recomendacoes de IA). Sera tratado como item separado em iteracao futura, pois requer arquitetura propria.

---

### 3. Modal "Criar Nova Oportunidade" (image-337, 338)

**Diferencas encontradas:**
- Referencia usa input numerico simples para Probabilidade (%) em vez de slider
- Layout levemente diferente: Titulo + Cliente na mesma linha, Valor + Estagio + Probabilidade na 2a linha, Tipo + Prioridade na 3a linha
- Sem campo "Comprador" no modal de referencia
- Sem campos "Motivo da Perda" e "Notas" separados

**Acoes:**
- Ajustar `NewOpportunityDialog.tsx`: trocar Slider por Input numerico para probabilidade
- Reorganizar layout: linha 1 (Titulo + Cliente), linha 2 (Valor + Estagio + Probabilidade), linha 3 (Tipo + Prioridade), Previsao de Fechamento full-width, Descricao full-width
- Manter campo Comprador (funcionalidade extra que nao prejudica)

---

### 4. Modal "Gerenciar Estagios do Pipeline" (image-339)

**Status:** Nao existe. Requer tabela nova `crm_pipeline_stages` com campos (id, company_id, name, probability, position, is_active, is_visible). E um recurso complexo com drag-and-drop reordenacao. Sera tratado como item separado.

---

### 5. Modal "Nova Tarefa" (image-340)

**Diferencas encontradas:**
- Referencia mostra layout com Titulo full-width, Cliente + Data de Vencimento na mesma linha, Prioridade + Status na mesma linha, Descricao full-width
- Subtitulo descritivo: "Preencha as informacoes para criar uma nova tarefa"
- Labels: "Cliente (Opcional)", "Escolha uma data"

**Acoes:**
- Ajustar dialog em `Tasks.tsx`: adicionar DialogDescription, reorganizar layout com grid 2 colunas para Cliente+Data e Prioridade+Status
- Ajustar placeholders

---

### 6. Modal "Criar Nova Recorrencia" (image-341, 343)

**Diferencas encontradas:**
- Referencia mostra: Cliente + Produto/Servico na mesma linha (ambos obrigatorios com *)
- Tipo de Recorrencia e um dropdown (Manutencao) em vez de input texto
- Periodicidade como input numerico em meses, nao dropdown de opcoes
- Novo campo "Aviso antecipado (dias)" com default 30
- Proxima Data + Valor Estimado na mesma linha
- Subtitulo: "Configure uma nova recorrencia para manutencoes ou renovacoes"

**Acoes:**
- Adicionar coluna `advance_notice_days` na tabela (via migracao)
- Reescrever dialog em `Recurrences.tsx`: layout 2 colunas, Tipo como dropdown (Manutencao, Renovacao, Servico Recorrente), periodicidade como input numerico, adicionar campo aviso antecipado
- Adicionar DialogDescription

---

### 7. Calendario de Recorrencias (image-342)

**Status:** O toggle Lista/Calendario ja foi implementado na iteracao anterior. A referencia confirma que o calendario mostra legenda com cores (Atrasada, Urgente, Proxima, Futura). Verificar se ja esta funcional.

---

### 8. Modal "Adicionar Novo Comprador" (image-344)

**Diferencas encontradas:**
- Referencia mostra "Empresa *" com campo de busca (search input) em vez de dropdown Select
- Campos obrigatorios diferentes: Nome Completo*, Cargo*, E-mail* (atual tem apenas Nome* e Cliente*)
- Nivel de Influencia com opcao "Medio" (atual tem Decisor, Influenciador, Usuario)
- Checkboxes: "Comprador ativo na empresa" e "Marcar como comprador principal"
- Botao "Importar CSV" no footer
- Subtitulo: "Cadastre um novo contato comprador no sistema"

**Acoes:**
- Reescrever `NewBuyerDialog.tsx`: campo empresa com busca, marcar Nome/Cargo/Email como obrigatorios
- Adicionar niveis de influencia: Alto, Medio, Baixo (alem dos existentes)
- Adicionar checkboxes is_active e is_primary (requerem colunas novas na tabela crm_buyers)
- Adicionar placeholder para "Importar CSV" (botao desabilitado como futuro)
- Adicionar DialogDescription

---

### Resumo de Alteracoes

| Tipo | Detalhe |
|------|---------|
| Migracao | 1 migracao: adicionar colunas em `clients` (cep, street, street_number, city, state), em `crm_buyers` (is_active, is_primary), em `crm_client_recurrences` (advance_notice_days) |
| Reescrever | `NewClientDialog.tsx`, `NewBuyerDialog.tsx` |
| Modificar | `NewOpportunityDialog.tsx` (probabilidade + layout), `Tasks.tsx` (dialog layout), `Recurrences.tsx` (dialog layout + campos) |
| Hook | `useRecurrences.ts` (incluir advance_notice_days no payload) |

### Itens adiados (proxima iteracao)
- Painel lateral de detalhes do cliente (image-336)
- Gerenciador de estagios do pipeline (image-339)

### Detalhes Tecnicos

**Migracao SQL:**
```text
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE crm_buyers ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE crm_buyers ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

ALTER TABLE crm_client_recurrences ADD COLUMN IF NOT EXISTS advance_notice_days integer DEFAULT 30;
```

**Ordem de implementacao:**
1. Migracao do banco
2. NewClientDialog (layout + comprador principal embutido)
3. NewBuyerDialog (busca empresa + checkboxes)
4. NewOpportunityDialog (probabilidade + layout)
5. Tasks dialog (layout)
6. Recurrences dialog (campos + layout)

