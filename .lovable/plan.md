# Walkthrough v2 — Profundidade e Correção de Layout

## Problemas identificados

1. **Conteúdo raso** — cada passo do walkthrough hoje descreve apenas "o que é a página", sem mostrar botões internos, campos, fluxos de uso, ou o que esperar ao clicar. Passa em cima da tela e sai.
2. **Botão "Próximo" fora do balão** — o balão tem 400 px de largura fixa e a linha de ações empilha 4 botões (`Voltar`, `Pausar`, `Pular`, `Próximo/Concluir`) numa única `flex` sem `flex-wrap`, então o "Próximo" transborda no CSS zoom atual (dpr 0.9).

## O que muda

### 1. Correção do balão (`WalkthroughOverlay.tsx`)

- Reorganizar a barra de ações em **duas linhas**:
  - Linha 1 (secundária, esquerda): `Voltar` · `Pausar` · `Pular` com `text-xs`.
  - Linha 2 (primária, direita): `Próximo` / `Concluir` ocupando largura confortável.
- Adicionar `flex-wrap` como fallback e trocar largura fixa 400 px por `min(420px, calc(100vw - 32px))`.
- Aumentar altura máxima do balão e permitir scroll interno quando o corpo for longo (`max-h-[70vh] overflow-y-auto` no bloco de conteúdo).

### 2. Aprofundamento dos passos

Estender o schema de `walkthrough_steps` para suportar conteúdo rico sem quebrar o que já existe:

- Novas colunas opcionais:
  - `intro` (text) — 1 frase de contexto ("Aqui você faz X").
  - `highlights` (jsonb) — lista de `{ label, description }` explicando botões/campos/áreas visíveis na tela.
  - `how_to_use` (jsonb) — lista ordenada de instruções passo-a-passo ("1. Clique em Nova Empresa … 2. Preencha CNPJ …").
  - `expected_outcome` (text) — o que o usuário deve esperar/ver depois.
  - `tips` (jsonb) — dicas, atalhos, cuidados.
- Renderização no `WalkthroughOverlay`:
  - Se houver campos novos, renderizar seções tituladas (`Sobre`, `Nesta tela você vê`, `Como usar`, `O que esperar`, `Dicas`) com ícones pequenos.
  - Manter compatibilidade com passos legados que só têm `body`.

### 3. Sub-passos por elemento

Hoje um passo aponta para a página inteira via seletor da sidebar. Vamos permitir **sub-passos internos** para os elementos-chave:

- Adicionar `parent_step_id` (uuid, nullable) e `is_substep` (boolean) em `walkthrough_steps`.
- Ao entrar num passo com sub-passos, o overlay percorre pai → sub-passos → próximo pai, com o spotlight se movendo entre os elementos internos (ex.: em `/super-admin/companies`: card de métricas → botão "Nova Empresa" → filtros → tabela → ações da linha).
- Requer `data-tour` nos elementos internos das páginas cobertas — adicionaremos progressivamente começando pelas rotas do Super Admin, que é onde o usuário está testando.

### 4. Reescrita do conteúdo (Super Admin primeiro)

Reescrever os 12 passos do roteiro `super_admin` como piloto, com `intro`, `highlights`, `how_to_use`, `expected_outcome`, `tips` preenchidos + sub-passos para os elementos internos de cada página. Depois estender aos outros 9 papéis em ondas.

### 5. Editor do Super Admin

Atualizar `/super-admin/walkthroughs` para editar os novos campos (textareas para `intro`/`expected_outcome`, editores de lista simples para `highlights`/`how_to_use`/`tips`, gestão de sub-passos aninhados).

## Detalhes técnicos

- Migration adiciona colunas com `default null` — nenhum passo existente quebra.
- `WalkthroughContext` passa a expor a lista achatada pai+sub-passos na ordem correta.
- `WalkthroughOverlay` recebe um `StepContent` component que decide entre render legado (`body`) e render rico.
- Sem mudança em RLS/grants (colunas novas herdam a policy da tabela).

## Escopo desta entrega

1. Fix do layout do balão (imediato).
2. Migration + render rico + editor.
3. Reescrita completa do roteiro `super_admin` (12 passos com sub-passos internos das telas Dashboard, Empresas, Inbox, Dashboard PM, Walkthroughs, Feed, Solicitações etc.).
4. Os demais 9 roteiros continuam funcionando com o conteúdo raso atual e serão reescritos em ondas seguintes (posso enfileirar tudo agora se você preferir).

Confirma seguir com esse escopo (Super Admin como piloto) ou quer que eu reescreva os 10 roteiros de uma vez?
