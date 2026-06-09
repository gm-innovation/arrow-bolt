Verificado no código — os dois pontos que você levantou são reais:

1. **`RisksHub.tsx` já lê `?tab=` via `useSearchParams`** ✅ (linha 11-12: `const [sp, setSp] = useSearchParams(); const tab = sp.get("tab") || "risks";`). Idem `CompetenciesHub.tsx`. Deep-links vão funcionar sem ajuste no hub.
2. **Sidebar NÃO destaca corretamente** ❌. Em `DashboardLayout.tsx` linha 377-380, `isActivePath` compara só `location.pathname`. Itens com mesmo pathname (`/quality/risks-hub?tab=context` e `?tab=processes`) ficariam **todos destacados ao mesmo tempo**. Tem que consertar.

## Correções no `src/components/DashboardLayout.tsx`

### 1. Reestruturar o grupo "Estratégia e Gestão"

Trocar o item único `Riscos & Oportunidades → /quality/risks` por um sub-grupo com 4 itens:

```
Riscos & Oportunidades (grupo expansível)
├─ Riscos & Oportunidades  → /quality/risks-hub?tab=risks
├─ Contexto Organizacional → /quality/risks-hub?tab=context
├─ Processos               → /quality/risks-hub?tab=processes
└─ SWOT / Cenário          → /quality/risks-hub?tab=scenario
```

Manter intactos no mesmo grupo: Planejamento (Objetivos/Indicadores/Mudanças), Partes Interessadas, Análise Crítica, Homologação.

### 2. Adicionar Organograma no grupo "Competências e Pessoas"

Novo item:
- **Organograma / Responsabilidades** → `/quality/competencies-hub?tab=org`

### 3. Corrigir `isActivePath` para considerar `?tab=`

Reescrever a função (linhas 377-380) para comparar pathname + tab:

```ts
const isActivePath = (path: string) => {
  // Separa pathname e query do path do menu
  const [menuPath, menuQuery = ""] = path.split("?");
  const menuTab = new URLSearchParams(menuQuery).get("tab");
  const currentTab = new URLSearchParams(location.search).get("tab");

  // Pathname tem que bater
  if (location.pathname !== menuPath
      && !(menuPath !== "/" && location.pathname.startsWith(menuPath + "/"))) {
    // Mantém as exceções de /corp/ que já existem
    if (!(path === "/corp/dashboard" && location.pathname.startsWith("/corp/") && !location.pathname.startsWith("/corp/feed") && !location.pathname.startsWith("/corp/profile") && !location.pathname.startsWith("/corp/university"))
        && !(path === "/corp/feed" && location.pathname.startsWith("/corp/profile"))) {
      return false;
    }
  }

  // Se o item do menu tem ?tab=, o tab da URL atual tem que casar exatamente
  if (menuTab) return currentTab === menuTab;

  // Se o item do menu NÃO tem ?tab=, só é ativo quando a URL também não tem tab
  // (evita "Riscos-hub raiz" ficar ativo quando estamos numa aba específica)
  // — mas só aplicamos essa regra para rotas que sabemos que têm versão com abas;
  // para o resto do app mantemos comportamento atual (qualquer tab conta como ativo).
  const pathsWithTabs = ["/quality/risks-hub", "/quality/competencies-hub", "/quality/dashboard", "/quality/settings"];
  if (pathsWithTabs.includes(menuPath) && currentTab) return false;

  return true;
};

```

Também atualizar o `useEffect` (linha 363) que abre o grupo do item ativo — usar a nova `isActivePath` no `.some(...)` em vez de comparação direta de `pathname`, para que o grupo "Riscos & Oportunidades" abra automaticamente quando entrar em qualquer um dos 4 sub-itens.

### 4. Garantir que o `<NavLink to={...}>` aceita query string

`react-router-dom` aceita `to="/quality/risks-hub?tab=context"` nativamente — não precisa mudar a renderização do item.

## Arquivos alterados

- `src/components/DashboardLayout.tsx` — reestrutura `qualidadeMenuItems` (grupo Estratégia + grupo Competências) e corrige `isActivePath` + `useEffect` de abertura de grupo.

(Não toco em `RisksHub.tsx` nem em `CompetenciesHub.tsx` — já leem `?tab=` corretamente.)

## Validação

- Navegar manualmente para cada link novo no preview e confirmar:
  - A aba certa abre.
  - Só **um** sub-item fica destacado no sidebar de cada vez.
  - O grupo "Riscos & Oportunidades" abre sozinho ao entrar em qualquer sub-item.
- Confirmar que itens antigos sem `?tab=` continuam funcionando normalmente (Documentos, NCRs etc.).

## Fora de escopo

- Não regero os PDFs (mapa/relatório) agora. Depois que o menu estiver consertado, refazemos os artefatos se você pedir.
