## Separar "Minha Conta" de "Parâmetros do Módulo"

### Arquivos

**Novo — `src/pages/account/AccountSettings.tsx`**
Página única com Tabs:
- **Conta**: nome (read-only, com nota "fale com RH/Diretoria"), e-mail (read-only)
- **Segurança**: trocar senha (mín. 8 caracteres, confirmação) usando `updatePassword` do AuthContext
- **Aparência**: switch tema claro/escuro (toggle de classe `dark` + persistência em `localStorage`)
- **Notificações**: placeholder "em breve"
- **Sessão**: placeholder "em breve"

**Novo — `src/components/account/AccountLayoutRoute.tsx`**
Wrapper que lê `userRole` do `useAuth`, mapeia para o `userType` do `DashboardLayout` e renderiza `<ProtectedRoute><DashboardLayout userType={...} /></ProtectedRoute>` com `<Outlet />`. Permite uma única rota `/account/settings` funcionar para todos os papéis preservando a sidebar do papel atual.

Mapeamento: `super_admin→super-admin`, `coordinator→admin`, `manager→director`, `director→director`, `technician→tech`, `hr→hr`, `commercial→commercial`, `compras→compras`, `qualidade→qualidade`, `financeiro→financeiro`.

**Editado — `src/App.tsx`**
- Importar `AccountLayoutRoute` e `AccountSettings`.
- Adicionar bloco antes do catch-all:
  ```
  <Route element={<AccountLayoutRoute />}>
    <Route path="/account/settings" element={<AccountSettings />} />
  </Route>
  ```

**Editado — `src/components/UserMenu.tsx`**
- Remover `getSettingsPath()`.
- Item passa a se chamar **"Minha Conta"** e navega para `/account/settings`.
- Item "Perfil" permanece como está.

**Editado — `src/components/DashboardLayout.tsx`**
- Em `qualidadeMenuItems`, o item `"Configurações"` (path `/quality/settings`) vira `"Parâmetros SGQ"`. Path e ícone preservados.

**Editado — `src/pages/quality/Settings.tsx`**
- Título: `"Configurações da Qualidade"` → `"Parâmetros do SGQ"`.
- Subtítulo: `"Catálogo de tipos de documento, ciclos de revisão e ajustes do Sistema de Gestão da Qualidade."`

### Não muda
- Rotas dos módulos (`/quality/settings`, `/admin/settings`, etc.) continuam existindo como painel de cada módulo.
- Página de Perfil.
- Demais itens de outros módulos na sidebar.