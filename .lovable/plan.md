

## Corrigir título do header nas rotas Corp

**Problema:** Ao clicar em "Solicitações Corp" no sidebar, o header mostra "Dashboard" (gerado automaticamente do path `/corp/dashboard`). Isso confunde o usuário.

**Solução:** Passar `pageTitle` para o `DashboardLayout` dentro do `CorpRoute`, usando um título fixo que represente o módulo corporativo.

**Alteração em `src/components/corp/CorpRoute.tsx`:**
- Adicionar prop `pageTitle` opcional ao `CorpRoute`, `CorpAdminRoute` e `CorpReportsRoute`
- Passar `pageTitle` para `DashboardLayout`

**Alteração em `src/App.tsx`:**
- Nas rotas corp, passar o `pageTitle` adequado:
  - `/corp/dashboard` → `pageTitle="Solicitações Corp"`
  - `/corp/requests` → `pageTitle="Solicitações Corp"`
  - `/corp/documents` → `pageTitle="Documentos Corp"`
  - `/corp/feed` → `pageTitle="Feed"`
  - `/corp/reports` → `pageTitle="Relatórios Corp"`
  - Rotas admin corp → `pageTitle="Admin Corp"`

Isso garante que o título no header sempre reflita o contexto correto, sem confundir com o "Dashboard" do módulo principal do usuário.

