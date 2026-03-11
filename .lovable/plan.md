

## Plano: Accordion na lista + dados consolidados dos filhos na visualização

### Alterações

**1. Lista de clientes — Accordion para filhos (`src/pages/admin/Clients.tsx`)**
- Reorganizar `filteredClients` para separar pais/independentes dos filhos
- Clientes-pai com filhos exibem um botão de expand/collapse (chevron)
- Ao expandir, os filhos aparecem aninhados abaixo com indentação e estilo diferenciado (border-dashed, fundo mais claro)
- Filhos não aparecem na lista principal (só dentro do accordion do pai)
- Usar estado local `expandedIds: Set<string>` para controlar quais grupos estão abertos

**2. Visualização do pai consolida dados dos filhos (`src/components/admin/clients/ClientViewDialog.tsx`)**
- Ao abrir "Visualizar" de um cliente-pai, buscar também os IDs dos filhos
- Para cada seção (Razões Sociais, Endereços, Contatos, Embarcações), buscar dados de **todos os IDs do grupo** (pai + filhos) usando `.in("client_id", allIds)`
- Exibir os dados agrupados com indicação de qual empresa cada item pertence (badge com nome do filho)
- Manter a seção de dados do pai primeiro, seguida dos dados de cada filho

**3. Edição — migrar dados legados para sub-tabelas (`src/components/admin/clients/LegalEntitiesSection.tsx` e `AddressesSection.tsx`)**
- Receber props `legacyCnpj` e `legacyAddress` do `CompanyInfoForm`
- Quando a lista de entidades/endereços está vazia e o dado legado existe, criar automaticamente um registro na sub-tabela
- `CompanyInfoForm` passa `clientData.cnpj` e `clientData.address` como props para as seções

### Detalhes técnicos

**Accordion na lista:**
```
Estado: expandedIds: Set<string>
Render: parentClients.map(parent => (
  <div>
    <ClientRow client={parent} onToggle={toggleExpand} isExpanded={...} />
    {isExpanded && childrenOf(parent).map(child => <ClientRow child indented />)}
  </div>
))
```

**Query consolidada no ViewDialog:**
```typescript
const allGroupIds = [client.id, ...childClients.map(c => c.id)];
// Buscar legal_entities, addresses, contacts, vessels usando .in("client_id", allGroupIds)
```

**Migração on-demand (edit):**
```typescript
// Em LegalEntitiesSection, useEffect:
if (entities.length === 0 && legacyCnpj) {
  create.mutate({ client_id, legal_name: clientName, cnpj: legacyCnpj, is_primary: true });
}
```

