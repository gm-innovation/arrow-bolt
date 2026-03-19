

## Correções Urgentes — 5 Issues

### 1. Medição Final mostra "Medição não encontrada" para Coordenador

**Causa**: Quando o coordenador clica em "Medição Final", o `MeasurementForm` busca um registro na tabela `measurements` para aquela OS. Se não existir, mostra "Medição não encontrada" — não há opção de criar.

**Correção em `src/components/admin/measurements/MeasurementForm.tsx`**:
- Quando `!measurement && !isLoading`, exibir um formulário para **criar a medição** com seleção de categoria (CATIVO/LABORATORIO/EXTERNO/ISENTO) e botão "Criar Medição", usando `useMeasurements.createMeasurement`.

### 2. Coordenador sem Universidade Corporativa no menu

**Causa**: O `adminMenuItems` (usado pelo coordenador via `userType === 'admin'`) não inclui "Universidade" no menu lateral.

**Correção em `src/components/DashboardLayout.tsx`**:
- Adicionar `{ title: "Universidade", icon: GraduationCap, path: "/corp/university" }` ao array `adminMenuItems` (após "Solicitações").

### 3. Vários usuários sem área de Configurações

**Causa**: O `UserMenu` aponta para rotas de settings que não existem para alguns tipos:
- `director` → `/corp/settings` (rota não existe)
- `manager` → `/manager/settings` (rota existe ✓)
- `admin` → `/admin/settings` (rota existe ✓)
- `tech` → `/tech/settings` (rota existe ✓)
- `hr` → `/hr/settings` (rota existe ✓)

O director aponta para `/corp/settings` que não tem rota. Provavelmente outros roles corporativos (supplies, quality, finance) têm rotas mas o director não.

**Correção em `src/components/UserMenu.tsx`**:
- Alterar o path de settings do `director` de `/corp/settings` para `/manager/settings` (já que o director usa as rotas do manager).

### 4. RH não consegue editar dados dos colaboradores

**Causa**: A aba "Dados" (`PersonalTab`) do `EmployeeDetailSheet` é somente leitura — exibe campos estáticos sem opção de edição. A edição só existe para o perfil de técnico na aba "Técnico".

**Correção em `src/components/hr/EmployeeDetailSheet.tsx`**:
- Transformar o `PersonalTab` de read-only para editável: adicionar botão "Editar" que abre campos de edição inline para nome, telefone.
- Permitir editar `full_name` e `phone` (campos do profile).
- Salvar via `supabase.from('profiles').update(...)`.

### 5. Diretor não vê coordenadores na lista

**Causa**: A query em `src/pages/manager/Coordinators.tsx` busca `user_roles` com `role = "coordinator"`, mas a política de RLS em `user_roles` pode não permitir que o diretor leia esses registros. O coordenador tem permissão de leitura em `user_roles`, mas o diretor pode não ter.

**Correção**: Verificar e adicionar política de RLS em `user_roles` que permita ao `director` ler roles da mesma empresa. Ou usar a função `has_role` em uma security definer function para buscar os coordenadores.

**Alternativa mais segura**: Criar uma RPC ou security definer function que retorna os coordenadores da empresa, contornando RLS.

### Arquivos a editar:
1. `src/components/admin/measurements/MeasurementForm.tsx` — adicionar UI de criação de medição
2. `src/components/DashboardLayout.tsx` — adicionar Universidade ao menu do coordenador
3. `src/components/UserMenu.tsx` — corrigir path de settings do director
4. `src/components/hr/EmployeeDetailSheet.tsx` — tornar PersonalTab editável
5. RLS policy em `user_roles` — permitir leitura por diretores (migration SQL)

