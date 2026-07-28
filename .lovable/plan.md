# Plano ajustado: histórico por alteração de código + bugs fora do Roadmap

## Problema a corrigir

O comportamento atual mistura duas coisas diferentes:

1. **Roadmap** deve representar melhorias, features e sugestões priorizáveis.
2. **Histórico** deve representar tudo que foi alterado no sistema, inclusive correções de código feitas para bugs, mesmo que o ticket continue aberto ou em validação.

No caso do ticket **#1003**, o bug já foi corrigido no código, mas o ticket continua aberto e sem changelog. Por isso ele não aparece como alteração no histórico. Além disso, ele aparece em **Gelo** porque o board usa `roadmap_horizon ?? "icebox"`, empurrando qualquer ticket sem horizonte para Gelo, inclusive bugs.

## O que vou implementar

### 1. Bugs não aparecem no Roadmap

Na aba **RICE & Roadmap**:

- A lista de RICE pode continuar mostrando bugs, porque bug também pode ter impacto/esforço.
- O quadro **Roadmap — Now / Next / Later / Gelo** deve mostrar somente:
  - `feature_request`
  - `improvement`
  - `suggestion`
- Tickets `bug` ficam fora do Roadmap, mesmo que tenham `roadmap_horizon = null`.
- Assim o #1003 sai da coluna **Gelo**.

### 2. Novo estado de implementação: “Código alterado”

Adicionar uma forma explícita de marcar que o código foi alterado para atender um ticket, separada de “Resolvido”.

Na interface do ticket no PM Dashboard:

- Botão/ação: **Registrar alteração de código**.
- Ao clicar, grava um evento no histórico informando que houve implementação/correção no sistema para aquele ticket.
- O ticket não precisa mudar para `resolved`; ele pode continuar aberto enquanto o usuário valida.

Exemplo de histórico esperado:

```text
Correção implementada — Ticket #1003
Campo para anexar atestado não aparece na aba de ausência
Código alterado e aguardando validação do usuário.
```

### 3. Registrar isso no `pm_activity_log`

Usar a tabela já existente `pm_activity_log`, sem criar nova tabela.

Será criado um evento com:

- `source = 'ticket'`
- `category = 'bug'` para bugs, ou a categoria real do ticket
- `module = impacted_module` ou `suggested_area`
- `title = 'Correção implementada — Ticket #1003'`
- `description = título/descrição resumida do ticket`
- `ref_table = 'support_tickets'`
- `ref_id = ticket.id`
- `author_id = usuário atual`
- `metadata` contendo:
  - `ticket_number`
  - `status_at_registration`
  - `code_change_registered: true`
  - `registered_from: 'pm_dashboard'`

Isso faz o histórico refletir a alteração de código imediatamente, independente do status do ticket.

### 4. Atualizar texto da tela de Histórico

A descrição atual fala em “tickets resolvidos”. Vou ajustar para deixar claro que a timeline registra:

- alterações de código
- correções
- melhorias
- releases
- ações da Marina
- migrations/funções

Sem depender exclusivamente do status resolvido.

### 5. Melhorar a visualização no Histórico

Na renderização do histórico:

- Eventos com `metadata.code_change_registered = true` aparecem com label mais claro, como **Código alterado** ou **Correção implementada**.
- Se o evento estiver ligado a um ticket, o card permite abrir o ticket original.

### 6. Opcional: marcar ticket como “aguardando validação”

Se já existir um status adequado, posso usar; caso contrário, manter o status atual e apenas registrar o evento. Para evitar mudança estrutural desnecessária, a primeira versão não cria novo status no banco.

## Verificação

Depois da implementação:

1. Abrir `/super-admin/pm-dashboard`.
2. Ir em **RICE & Roadmap**:
   - #1003 não aparece mais em **Gelo**.
   - Bugs não entram no board do Roadmap.
3. Abrir o ticket #1003 no PM Dashboard.
4. Clicar em **Registrar alteração de código**.
5. Ir em **Histórico**:
   - deve aparecer um evento de correção/alteração de código para o #1003.
   - o ticket pode continuar aberto, porque o histórico agora registra implementação, não apenas resolução.
