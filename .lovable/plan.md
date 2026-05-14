## Correção proposta

O problema está na linha do cliente em `/admin/clients`: quando há vários emails no campo `email`, o texto cresce sem limite dentro do bloco central e empurra os botões `Visualizar / Histórico / Editar / Lixeira` para fora da caixa.

Vou corrigir isso em `src/pages/admin/Clients.tsx` sem mudar a regra de negócio.

## O que será alterado

### 1. Travar a largura do bloco de informações

No layout da linha (`renderClientRow`):

- O bloco da esquerda passa a usar `min-w-0`.
- O bloco de dados do cliente passa a usar `min-w-0` e ocupar apenas o espaço disponível.
- O bloco dos botões de ação passa a usar `shrink-0`, para nunca ser empurrado para fora.

### 2. Limitar nome, email, telefone e demais metadados

- Nome do cliente com truncamento seguro (`truncate`) quando for longo.
- Email com `truncate`, `max-w-*` responsivo e `title` com o texto completo no hover.
- Telefone e embarcações com `whitespace-nowrap`, sem quebrar o alinhamento.
- Container dos metadados com `min-w-0`, para o truncamento funcionar corretamente.

### 3. Ajustar os botões para permanecerem dentro do card

- A área dos botões fica fixa à direita da linha (`shrink-0`).
- Em telas menores, a linha pode quebrar de forma controlada, deixando os botões abaixo, mas ainda dentro da caixa.
- No viewport atual desktop, os botões devem continuar à direita e alinhados.

### 4. Preservar o restante

Não vou alterar:

- Permissões de Coordenador.
- Ações em massa.
- Filtro Omie.
- Exclusão individual ou em lote.
- Banco, RLS ou backend functions.

## Arquivo afetado

- `src/pages/admin/Clients.tsx`

## Resultado esperado

Mesmo com muitos emails no cliente, a linha continua dentro da caixa, os textos são encurtados visualmente com reticências e os botões permanecem visíveis/alinhados.