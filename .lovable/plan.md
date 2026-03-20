

## 3 Correções: Lista de Coordenadores, Diretoria com acesso completo às OSs, e Docs no RH

### 1. Coordenadores em formato lista (não cards)

**Arquivo:** `src/pages/manager/Coordinators.tsx`

Trocar o layout de grid de cards para uma tabela (Table) com colunas: Nome, Email, Total OSs, Concluídas, Em Andamento, Pendentes, Ações (botão "Ver Detalhes"). Manter a busca e o comportamento de navegação.

### 2. Diretoria com acesso completo às OSs (visualizar, editar, medições)

**Problema:** O diretor usa `src/pages/manager/ServiceOrders.tsx` que é somente leitura — apenas uma tabela com `ViewOrderDetailsDialog`. Já o coordenador usa `src/pages/admin/ServiceOrders.tsx` que tem edição, transferência, medições, etc.

**Correção:** Substituir o conteúdo de `src/pages/manager/ServiceOrders.tsx` para reutilizar a mesma página do coordenador (`src/pages/admin/ServiceOrders.tsx`), ou importar/reexportar diretamente. A forma mais limpa é fazer o `manager/ServiceOrders.tsx` importar e renderizar o componente de `admin/ServiceOrders.tsx`.

Também será necessária uma **migration SQL** para garantir que o papel `director` tenha permissões RLS de INSERT/UPDATE/DELETE em:
- `service_orders` (criar/editar OSs)
- `service_visits`, `visit_technicians`, `tasks` (gerenciar visitas e tarefas)
- Tabelas de medição (já corrigido na migration anterior, mas validar)

### 3. RH pode enviar e excluir documentos na ficha do colaborador

**Arquivo:** `src/components/hr/EmployeeDetailSheet.tsx` — função `DocumentsTab`

Atualmente a aba "Docs" apenas lista e permite download. Adicionar:
- **Botão "Enviar Documento"** que abre um formulário inline com: título, tipo de documento (select), e input de arquivo
- Upload do arquivo para o bucket `corp-documents` e insert na tabela `corp_documents` com `owner_user_id = employeeId`
- **Botão de excluir** em cada documento (com confirmação) — usando `supabase.from('corp_documents').delete()` e removendo do storage
- Apenas documentos `source === "corp"` podem ser excluídos pelo RH (docs técnicos são gerenciados na aba Técnico)

### Arquivos a editar:
1. `src/pages/manager/Coordinators.tsx` — trocar cards por tabela
2. `src/pages/manager/ServiceOrders.tsx` — reutilizar o componente completo do admin
3. `src/components/hr/EmployeeDetailSheet.tsx` — adicionar upload e exclusão de docs
4. **Migration SQL** — adicionar políticas RLS para o papel `director` em `service_orders`, `service_visits`, `visit_technicians`, `tasks`

