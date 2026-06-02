## Diagnóstico

Você tem razão em reclamar: o comportamento atual não é seguro para trabalho em andamento.

Identifiquei duas frentes:

1. **Página de carreiras**
   - O editor salva “Sobre/Cultura” direto em `companies`, mas não confirma o retorno salvo com robustez.
   - O rascunho foi colocado em `sessionStorage`; isso ajuda ao navegar, mas não é suficiente contra hard refresh, falha de update ou troca de contexto.
   - Benefícios são salvos via dialog separado, mas o conteúdo institucional e a página pública dependem de refetch/cache. Se o save falha silenciosamente ou o usuário sai antes da confirmação, parece que salvou, mas a página pública volta vazia.

2. **Remount global do sistema**
   - O app usa layouts separados por bloco de rotas (`/hr`, `/admin`, `/manager`, `/corp`, etc.). Ao trocar de bloco, o `DashboardLayout` desmonta e monta de novo.
   - Isso reinicia sidebar, conteúdo, estados locais, formulários e componentes lazy-loaded.
   - A persistência de abas que foi adicionada ajuda só uma parte do problema; não impede perda de estado em formulários e filtros de páginas.

## Plano de correção

### 1. Tornar o editor de Carreiras à prova de perda

- Trocar o rascunho da página de carreiras de `sessionStorage` para `localStorage`, com chave por empresa.
- Auto-salvar enquanto digita: título, cultura, missão, valores e rascunho de valores.
- Não apagar o rascunho até confirmar que o banco realmente retornou os dados atualizados.
- Após salvar, fazer refetch e comparar os dados retornados com o que foi enviado.
- Se o save falhar ou a confirmação não bater, manter o rascunho e mostrar erro claro.
- Adicionar status visível: “Rascunho salvo localmente”, “Salvando...”, “Publicado com sucesso”.

### 2. Corrigir publicação/visualização pública da página de carreiras

- Depois de salvar “Sobre/Cultura”, invalidar/refazer as queries relacionadas à empresa.
- Garantir que os campos salvos são exatamente os mesmos lidos pela função pública `public-careers-info`.
- Evitar que a página pública mostre dados vazios por cache/refetch antigo após salvar.

### 3. Persistir abas de forma mais forte

- Alterar o componente global `Tabs` para usar `localStorage` por padrão quando houver `storageKey`, não `sessionStorage`.
- Manter opção `persist="session"` se alguma tela precisar do comportamento temporário.
- Adicionar `storageKey` nas abas importantes que ainda ficaram sem persistência, como `TaskDetails`, `ApiDocs`, `MeasurementSettings`, `Corp Requests` e outras encontradas na varredura.

### 4. Reduzir remount desnecessário do layout/sidebar

- Reestruturar o roteamento para manter `AuthProvider`, `SidebarProvider`, `ErrorBoundary` e um shell autenticado estáveis dentro do app privado.
- Criar/usar um wrapper autenticado único para rotas internas, evitando que blocos inteiros de layout desmontem quando o usuário navega entre áreas compatíveis.
- Persistir estado da sidebar (`collapsed`) em `localStorage`, então mesmo se houver remount inevitável, ela volta no mesmo estado.

### 5. Proteger outros formulários contra perda futura

- Criar um hook reutilizável de rascunho local, por exemplo `usePersistentDraft`, com:
  - chave por página/empresa/registro;
  - debounce leve;
  - restauração automática;
  - limpeza só após save confirmado.
- Aplicar agora no editor de Carreiras e deixar pronto para aplicar em formulários críticos sem reinventar lógica.

## Arquivos principais

- `src/components/hr/CareersPageEditor.tsx`
- `src/components/ui/tabs.tsx`
- `src/App.tsx`
- `src/components/DashboardLayout.tsx`
- possível novo hook: `src/hooks/usePersistentDraft.ts`
- páginas com abas ainda sem `storageKey`

## Fora do escopo

- Não mexer em schema/tabelas.
- Não alterar visual da página pública de carreiras.
- Não mudar permissões ou autenticação.

O objetivo é: digitou, não perde; salvou, confirma no banco; navegou, volta onde estava; sidebar e contexto não ficam reiniciando sem necessidade.