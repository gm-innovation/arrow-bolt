

## Plano: Agente IA para extrair e preencher dados da Descrição do Serviço

### Problema
A "Descrição Detalhada do Serviço" do Omie contém dados estruturados em texto livre (embarcação, equipe, data, local, solicitante, cliente, supervisor, coordenação, escopo) que hoje são ignorados. Apenas o nome do cliente e embarcação são extraídos via regex simples.

### Solução
Usar a Lovable AI (já configurada com `LOVABLE_API_KEY`) para interpretar o texto da descrição via tool calling e extrair campos estruturados. O backend faz o parsing com IA e casa cada campo com registros locais do banco.

### Campos extraídos da descrição (conforme imagem)

| Campo na descrição | Campo no formulário | Match no banco |
|---|---|---|
| Embarcação: SIERRA NEVADA | `vesselId` | `vessels.name` |
| Equipe: Gabriel e Carlos Augusto | `selectedTechnicians` | `profiles.full_name` via `technicians` |
| Data: 20/02/2026 | `serviceDateTime` | direto |
| Local: Antonio Carlos / Ilha da Conceição | `plannedLocation` | direto (texto) |
| Solicitante: Marta Brasileiro | `requesterId` | `client_contacts.name` |
| Supervisor: Leonardo | `supervisorId` | `profiles.full_name` (coordinators) |
| Coordenação: Priscila | `coordinatorId` | `profiles.full_name` (coordinators) |
| Escopo: Survey - TESTES... | `description` + `taskTypes` | `task_types.name` |

### Alterações

**1. Backend (`supabase/functions/omie-proxy/index.ts`)**
- Nova função `parseServiceDescriptionWithAI(text, supabase, companyId, clientId)`
- Chama Lovable AI Gateway com tool calling para extrair JSON estruturado:
  - `vessel_name`, `team_members[]`, `date`, `location`, `requester_name`, `supervisor_name`, `coordinator_name`, `scope_description`
- Para cada campo extraído, faz match no banco:
  - `team_members` → busca em `technicians` JOIN `profiles` por `full_name ILIKE`
  - `requester_name` → busca em `client_contacts` por `name ILIKE`
  - `supervisor_name` / `coordinator_name` → busca em `profiles` com role `coordinator`
  - `scope_description` → busca palavras-chave em `task_types.name`
- Retorna objeto `parsedData` com IDs locais encontrados
- Chamado dentro de `handleConsultOrder` após extrair `serviceDescription`

**2. Interface `OmieImportData` (`OmieImportDialog.tsx`)**
- Expandir para incluir novos campos: `serviceDateTime`, `plannedLocation`, `requesterId`, `supervisorId`, `coordinatorId`, `technicianIds[]`, `taskTypeIds[]`
- Exibir resumo dos dados extraídos no preview (equipe, data, local, escopo)

**3. `NewOrderDialog.tsx`**
- Passar todos os novos campos no `omieImportData`

**4. `NewOrderForm.tsx`**
- Expandir o `useEffect` de import para setar todos os novos campos:
  - `serviceDateTime`, `plannedLocation`, `requesterId`, `supervisorId`, `coordinatorId`
  - `selectedTechnicians` (state direto)
  - `taskTypes` via `form.setValue`
- Delays escalonados para campos que dependem de dados carregados (vessel, requester dependem do client)

### Fluxo
```text
Omie API → serviceDescription (texto livre)
         → Lovable AI (tool calling) → JSON estruturado
         → Match IDs no banco (technicians, contacts, supervisors, task_types)
         → Retorna parsedData enriquecido
         → OmieImportDialog exibe resumo completo
         → NewOrderForm auto-preenche TODOS os campos
```

### Segurança
- Chamada à IA feita no backend (edge function), nunca no client
- `LOVABLE_API_KEY` já disponível como secret
- Modelo: `google/gemini-2.5-flash` (rápido e barato para extração simples)

