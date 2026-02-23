

## Mover Feed Corporativo para o menu lateral

### Contexto

O Feed Corporativo e o canal central de comunicados oficiais da empresa. Hoje ele esta escondido dentro das abas do modulo Corporativo (Solicitacoes). Deve ser um item proprio no menu lateral, acessivel de qualquer pagina, por todos os perfis.

### O que muda

1. **Menu lateral (`DashboardLayout.tsx`)**: Adicionar item "Feed" com icone `MessageSquare` em todos os menus de todas as roles (super_admin, admin, manager, tech, hr, commercial, director), apontando para `/corp/feed`.

2. **CorpLayout (`CorpLayout.tsx`)**: Remover a aba "Feed" das tabs do modulo corporativo, pois o Feed agora e acessado diretamente pela sidebar.

3. **Dashboard Corp (`Dashboard.tsx`)**: Manter o card "Feed Recente" no dashboard corporativo como preview rapido (ja existe, nao precisa mudar).

4. **Pagina do Feed (`Feed.tsx`)**: Nenhuma mudanca. A rota `/corp/feed` e a pagina ja existem e continuam funcionando normalmente.

5. **Rota no `App.tsx`**: Ja existe a rota `CorpRoute` para `/corp/feed`. Nenhuma mudanca necessaria.

### Resumo das alteracoes por arquivo

| Arquivo | Alteracao |
|---------|----------|
| `src/components/DashboardLayout.tsx` | Adicionar item "Feed" (icone MessageSquare, path `/corp/feed`) em todos os arrays de menu (superAdminMenuItems, adminMenuItems, managerMenuItems, techMenuItems, hrMenuItems, commercialMenuItems, directorMenuItems) |
| `src/components/corp/CorpLayout.tsx` | Remover a entrada `feed` do array `tabs` |

### Notas

- O Feed continua sendo renderizado dentro de `CorpLayout` (que mantem as abas Dashboard, Solicitacoes, Documentos, Relatorios, Admin). Isso e intencional: ao clicar no Feed pela sidebar, o usuario ve a pagina do Feed com o layout corporativo ao redor.
- Os novos modulos (Suprimentos, Financeiro, Qualidade) serao construidos separadamente em etapas futuras, cada um como modulo independente com suas proprias rotas e sidebar items.
