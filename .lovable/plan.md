Você tem razão: o tour ainda está estruturado como “visão geral por página” em várias rotas, e o clique automático ficou incompleto. Vou corrigir isso como uma reestruturação do walkthrough, não como ajuste pontual.

## Diagnóstico confirmado

- O roteiro do Super Admin ainda tem páginas com apenas 1 passo geral: `API & Integrações`, `Agente de IA`, `Inbox de Suporte`, `Dashboard PM`, `Configurações`, `Assinaturas` e `Walkthroughs`.
- O Dashboard tem subpassos, mas ainda mantém passos gerais sem seletor no começo/fim, então o usuário vê balões genéricos.
- O editor exibe campos de “Clique automático”, mas o salvamento dos passos não grava `post_action_selector` nem `close_on_exit`; isso impede configurar corretamente novos cliques pelo próprio editor.
- O motor atual mistura “explicar o botão” com “clicar e mostrar o modal” no mesmo passo. O correto é: primeiro destacar o elemento, depois executar o clique e explicar o modal/menu aberto.
- Menus de linha e modais ainda não têm âncoras internas suficientes para o tour apontar item por item.

## Plano de correção

### 1. Corrigir o motor do walkthrough

- Atualizar os tipos do walkthrough para incluir oficialmente:
  - `auto_click`
  - `post_action_selector`
  - `close_on_exit`
- Corrigir o salvamento no editor para persistir esses campos.
- Melhorar o fechamento automático de modais/menus ao sair de um passo:
  - tentar `Escape` corretamente;
  - tentar botão de fechar do modal;
  - não deixar modal anterior atrapalhar o próximo passo.
- Separar o comportamento esperado:
  - passo normal: destaca e explica o elemento;
  - passo `auto_click`: clica no seletor, aguarda modal/menu/página e destaca o resultado.

### 2. Padronizar a estrutura dos passos

Para cada botão/modal/menu importante, o roteiro ficará assim:

```text
Página
  Elemento: explica o botão, filtro, tabela ou card
  Ação: clica automaticamente quando necessário
  Resultado: explica o modal, menu, dropdown, aba ou página aberta
```

Exemplo:

```text
Empresas
  Botão Nova Empresa
  Formulário de nova empresa
  Filtros
  Tabela de empresas
  Menu de ações da linha
  Item Editar
  Modal Editar Empresa
  Item Excluir
  Confirmação de exclusão
```

### 3. Adicionar âncoras `data-tour` onde faltam

Vou cobrir as rotas do Super Admin:

- `/super-admin/dashboard`
- `/super-admin/companies`
- `/super-admin/users`
- `/super-admin/subscriptions`
- `/super-admin/settings`
- `/super-admin/api-docs`
- `/super-admin/ai-management`
- `/super-admin/support-inbox`
- `/super-admin/pm-dashboard`
- `/super-admin/walkthroughs`
- `/super-admin/profile`, se houver fluxo útil no menu de usuário

E também os componentes internos usados nelas, como:

- diálogos de nova empresa/novo usuário;
- diálogos de edição;
- menus de ações de linha;
- abas;
- filtros;
- botões de exportar/copiar/atualizar;
- botões de gerar prompt, recalcular, salvar e testar;
- cards e tabelas principais.

### 4. Recriar o roteiro do Super Admin no banco de dados

- Remover a dependência de balões genéricos por página.
- Manter apenas passos-pai curtos como agrupadores.
- Inserir subpassos reais para cada elemento.
- Configurar `auto_click` nos pontos que abrem:
  - modais;
  - menus dropdown;
  - alertas de confirmação;
  - abas internas;
  - detalhes de ticket;
  - editor de roteiro/passo.
- Marcar passos de modal com `close_on_exit` quando necessário.

### 5. Tratar páginas longas e rolagem

- Garantir que o balão nunca fique cortado.
- Garantir que o elemento destacado role para a área visível antes de exibir o balão.
- Evitar passos presos em elementos abaixo da dobra, como aconteceu em `API & Integrações`.

### 6. Validar com teste real no navegador

Vou rodar o tour do Super Admin e validar pelo menos estes fluxos:

- Dashboard não mostra só balão geral.
- Empresas: botão Nova Empresa abre modal e o modal é explicado.
- Usuários: botão Novo Usuário abre modal; menu de linha abre dropdown; editar/excluir são explicados.
- Assinaturas: menu de linha abre dropdown e modais de plano/status/cancelamento são explicados.
- API & Integrações: não corta o balão e abre modal/logs quando solicitado.
- Agente de IA e Dashboard PM: abas internas são clicadas e explicadas individualmente.
- Walkthroughs: o próprio editor mostra roteiro, passos, subpassos e modal de edição.

## Critério de pronto

O tour só estará pronto quando cada página principal do Super Admin deixar de depender de um balão geral e passar a guiar o usuário por elementos reais, incluindo cliques automáticos nos botões/ícones que abrem menus, modais, abas ou detalhes.