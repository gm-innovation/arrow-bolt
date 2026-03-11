

## Diagnóstico e Plano de Correção

### Problema 1: Técnicos não aparecem no frontend (lista vazia + técnico "fantasma")
**Causa raiz**: As políticas RLS da tabela `technicians` permitem leitura apenas para roles `admin`, `hr`, `manager` e `super_admin`. O usuário logado (Lucas Ramos) tem role `coordinator`, que **não tem permissão** de leitura. Por isso:
- A página "Técnicos" mostra "Nenhum técnico encontrado"
- No formulário da OS, o técnico Gabriel é adicionado ao state `selectedTechnicians` pelo import, mas a lista `technicians` retorna vazia → o componente `TechniciansSelection` não consegue encontrar o nome (`tech.profiles?.full_name` = undefined)

### Problema 2: Embarcação e Solicitante não são preenchidos
A IA extrai "Sierra Nevada" e "Marta Brasileiro", mas não existem no banco. O sistema hoje simplesmente ignora matches não encontrados.

### Correções

**1. Migração SQL — Adicionar RLS para `coordinator` na tabela `technicians`**
```sql
CREATE POLICY "Coordinators can view company technicians"
ON public.technicians FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'coordinator'::app_role) 
  AND company_id = user_company_id(auth.uid()));

CREATE POLICY "Coordinators can manage company technicians"
ON public.technicians FOR ALL TO authenticated
USING (has_role(auth.uid(), 'coordinator'::app_role) 
  AND company_id = user_company_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'coordinator'::app_role) 
  AND company_id = user_company_id(auth.uid()));
```

**2. Backend (`omie-proxy/index.ts`) — Auto-criar embarcação e contato quando não encontrados**
- Após o match de vessel falhar, se a IA extraiu `vessel_name`: criar na tabela `vessels` com `client_id` e retornar o novo registro
- Após o match de requester falhar, se a IA extraiu `requester_name`: criar na tabela `client_contacts` com `client_id` e retornar o novo registro
- Ampliar busca de supervisor/coordenador para incluir também técnicos (profiles com qualquer role na empresa), não apenas coordinators

**3. Frontend (`OmieImportDialog.tsx`) — Mostrar campos não vinculados com aviso**
- Exibir campos extraídos pela IA mesmo quando não vinculados (ex: "⚠️ Embarcação: Sierra Nevada — será cadastrada automaticamente")
- Indicar quais registros serão criados automaticamente

**4. Frontend (`NewOrderForm.tsx`) — Recarregar listas após auto-criação**
- Quando `omieImportData` contém um vessel/contact recém-criado no backend, o `useEffect` reativo já irá encontrá-los nas listas após o fetch

### Arquivos alterados
- **Migração SQL**: nova policy RLS
- **`supabase/functions/omie-proxy/index.ts`**: auto-criação de vessel e contact, busca ampliada de supervisor
- **`src/components/admin/orders/OmieImportDialog.tsx`**: exibir campos não vinculados com indicador visual
- **`src/components/admin/orders/NewOrderForm.tsx`**: ajustes menores para lidar com dados auto-criados

