## Correções e evolução do Walkthrough

### 1. Balão do Dashboard só mostra passo geral

Confirmado em `src/pages/super-admin/Dashboard.tsx`: não há nenhum atributo `data-tour` na página. Por isso o passo de Dashboard no roteiro `tour-super-admin` continua sendo apenas o passo-pai único (spotlight no item da sidebar), sem sub-passos por elemento.

**Correção:**
- Adicionar `data-tour` nos elementos do Dashboard:
  - `dashboard-header` (título + botões de ação)
  - `dashboard-new-company`, `dashboard-subscriptions`, `dashboard-settings` (nos 3 botões do cabeçalho)
  - `dashboard-kpis` (bloco `SuperAdminStats`)
  - `dashboard-charts` (bloco `SuperAdminCharts`)
  - `dashboard-summary` (card "Resumo do Sistema")
- Popular sub-passos correspondentes em `walkthrough_steps` para o script Super Admin, um por elemento, no padrão já usado em Empresas/Usuários (título, intro, how_to_use, expected_outcome, tips).

### 2. Não dá para rolar / avançar em "API & Integrações"

Reproduzido pelo screenshot: o balão fica ancorado abaixo do item da sidebar (que está próximo do rodapé da tela) e a lógica atual em `WalkthroughOverlay.tsx` fixa apenas `top` com uma reserva estática de 360 px (`window.innerHeight - 360`), sem limitar a altura ao espaço realmente disponível. Quando o conteúdo é longo (caso de "API & Integrações", com Nesta tela / Como usar / O que esperar / Dicas), o balão extrapola o viewport, o rodapé com **Próximo** fica fora da tela e o corpo rolável não permite passar dele.

**Correção em `src/components/walkthrough/WalkthroughOverlay.tsx`:**
- Calcular `maxHeight` dinamicamente = `viewport - top - 16`, aplicando também quando o balão está posicionado ao lado do elemento.
- Se não couber abaixo do elemento, tentar posicionar acima (`rect.top - bubbleHeight - 12`); caso ainda assim não caiba, ancorar no topo do viewport (`top: 16`) — a rolagem interna do corpo passa a expor o rodapé.
- Garantir que o footer (barra com Próximo/Voltar/Pausar/Pular) fique fixo (fora do `overflow-y-auto`, o que já é o caso) e que o container obedeça o novo `maxHeight`.
- Como reforço, reduzir `BUBBLE_W` em telas estreitas continua igual; a mudança é só na altura.

### 3. Passos que abrem modal/nova tela precisam clicar e explicar o alvo

Hoje `walkthrough_steps.action` já aceita `"click" | "navigate" | "wait" | "none"`, mas nenhum click é executado automaticamente: o overlay só desenha o spotlight. Precisamos executar a ação de fato e depois explicar o resultado.

**Mudanças:**

1. **Novo tipo de ação `auto_click`** (adicionado como valor válido em `action`, já é string) e coluna auxiliar `post_action_selector text` em `walkthrough_steps` — o seletor a esperar depois do click (ex.: `[role=dialog]` para modais, ou uma rota nova). Ambos opcionais; migração aditiva.
2. **`WalkthroughOverlay.tsx`**: quando o usuário clicar em **Próximo** em um passo com `action = 'auto_click'`:
   - dispara `element.click()` no alvo do spotlight;
   - aguarda `post_action_selector` (com `MutationObserver`, timeout 4 s) — reusa a mesma primitiva `findEl` que já existe;
   - só então avança para o próximo sub-passo (que deve estar semeado com o `selector` = `post_action_selector`, tipicamente o `[role=dialog]` do modal).
3. **`WalkthroughContext.tsx`**: expor helper `advanceAfterAction()` para o overlay disparar; caso o alvo do próximo passo esteja em outra rota (navegação SPA), o context já cuida do `navigate()`.
4. **Fechamento do modal**: quando o passo seguinte terminar (usuário clica **Próximo** ou **Voltar** para fora do escopo do modal), o overlay tenta fechar o modal apertando `Escape` ou clicando no botão com `aria-label="Close"` — comportamento controlado por nova flag `close_on_exit boolean` no passo do modal.
5. **Editor `/super-admin/walkthroughs`**: adicionar no diálogo de passo os campos "Executar clique automático", "Aguardar seletor" e "Fechar ao sair" para configurar tudo pela UI.
6. **Seeds**: expandir sub-passos do Super Admin em que existe modal — por exemplo `companies-new` e `users-new` (abrem `NewCompanyDialog`/`NewUserDialog`) ganham um sub-passo filho com `action='auto_click'` que abre o modal e um passo neto que descreve os campos do formulário; idem para `Novo API Key` em API & Integrações.

### Escopo desta entrega

- Dashboard Super Admin ganha sub-passos por elemento (6 novos).
- Balão nunca mais fica com Próximo fora da tela (cálculo dinâmico de altura + fallback acima/topo).
- Motor de walkthrough passa a suportar clique automático e exploração de modais, com editor e seeds iniciais para os modais de "Nova Empresa", "Novo Usuário" e "Nova Chave de API".
- Demais páginas do Super Admin (Inbox, PM, Roadmap, Walkthroughs, Feed, Solicitações, Configurações) continuam como passo-pai único até você pedir para desdobrar — mesma diretriz combinada anteriormente.

### Detalhes técnicos

- Migration aditiva em `walkthrough_steps`: `post_action_selector text null`, `close_on_exit boolean not null default false`; sem mudanças de RLS (as políticas já cobrem toda a tabela).
- `action` continua sendo `text` livre no banco; o front passa a reconhecer o valor `auto_click`.
- Nada muda no `WalkthroughProvider` além do novo `advanceAfterAction`.
- Recalcular `maxHeight` no mesmo `useLayoutEffect` que já trata `resize/scroll`, então não há novo observador.
