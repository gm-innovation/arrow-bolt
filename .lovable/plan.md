

## Plano: Agrupar clientes com múltiplas razões sociais

### Contexto
Muitos clientes importados do Omie são a mesma empresa, mas cadastrados como registros separados com razões sociais e CNPJs diferentes. Hoje não há forma de agrupá-los.

### Solução: Cliente-pai (parent_client_id)

Adicionar um campo `parent_client_id` na tabela `clients` (auto-referência). Clientes "filhos" ficam vinculados ao cliente principal do grupo. Isso permite:
- Ver todos os CNPJs/razões sociais de um grupo como uma só entidade
- Agregar KPIs (receita, oportunidades) do grupo inteiro
- Manter compatibilidade com o Omie (registros individuais continuam existindo)

### Alterações

**1. Migração SQL**
- Adicionar coluna `parent_client_id UUID REFERENCES clients(id) ON DELETE SET NULL` na tabela `clients`
- Índice para performance

**2. UI — Botão "Agrupar" na tabela de clientes**
- Na `ClientsTable`, adicionar busca e seleção para vincular um cliente a outro como "pai"
- Dialog para selecionar o cliente principal ao agrupar
- Indicação visual de clientes agrupados (ícone/badge com contagem de filhos)

**3. UI — Visualização agrupada**
- Na `ClientsTable`, opção de toggle "Ver agrupados" que colapsa filhos sob o pai
- Na `ClientDetailSheet`, nova seção "Empresas do Grupo" listando os filhos com suas razões sociais/CNPJs
- KPIs do dossiê agregam dados de todo o grupo

**4. Componente de agrupamento**
- `ClientGroupDialog`: permite selecionar múltiplos clientes e escolher qual é o principal
- Ação de "desagrupar" para remover vínculo

### Fluxo do usuário
1. Na tabela de clientes, seleciona 2+ clientes → clica "Agrupar"
2. Escolhe qual é o cliente principal (pai)
3. Os demais viram filhos — continuam existindo mas aparecem agrupados
4. No dossiê do pai, seção "Empresas do Grupo" mostra todos os filhos

### Detalhes técnicos
```sql
ALTER TABLE public.clients 
  ADD COLUMN parent_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
CREATE INDEX idx_clients_parent ON public.clients(parent_client_id) WHERE parent_client_id IS NOT NULL;
```

- Query agrupada: clientes onde `parent_client_id IS NULL` (são pais ou independentes), com count de filhos via subquery
- Filhos herdam o segmento/status do pai na visualização, mas mantêm dados próprios

