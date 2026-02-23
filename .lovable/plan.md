

## Alteracoes no Modulo de Solicitacoes

### 1. Renomear "Requisicoes" para "Solicitacoes"

Trocar todas as ocorrencias de "Requisicao/Requisicoes" por "Solicitacao/Solicitacoes" nos textos exibidos ao usuario nos seguintes arquivos:

| Arquivo | Alteracoes |
|---------|-----------|
| `src/components/corp/CorpLayout.tsx` | Tab label: "Requisicoes" -> "Solicitacoes" |
| `src/pages/corp/Requests.tsx` | Placeholder de busca, mensagem vazia, titulos de colunas |
| `src/components/corp/NewRequestDialog.tsx` | Titulo do dialog, botao, placeholder, labels, toasts |
| `src/components/corp/RequestDetailSheet.tsx` | Textos da timeline |
| `src/components/corp/ApprovalActions.tsx` | Titulo do dialog de rejeicao |
| `src/hooks/useCorpRequests.ts` | Mensagens de toast |
| `src/pages/corp/Dashboard.tsx` | Titulos dos cards e secoes |

### 2. Tornar o campo "Valor" opcional e contextual

Atualmente o formulario de nova solicitacao sempre exibe o campo "Valor (R$)". Solicitacoes podem ser de folga, ferias, documentacao, etc. O campo de valor sera:
- Mantido, mas com label "Valor (se aplicavel)"
- Escondido ou exibido com base no tipo selecionado (quando nao ha tipo, permanece visivel como opcional)

### 3. Separar em 2 abas: "Minhas Solicitacoes" e "Recebidas"

A pagina de Solicitacoes passara a ter 2 abas usando Tabs:

```text
+--------------------------------------------------+
| [Minhas Solicitacoes]  [Recebidas]               |
+--------------------------------------------------+
| Conteudo da aba ativa                            |
+--------------------------------------------------+
```

**Aba "Minhas Solicitacoes":**
- Mostra apenas solicitacoes onde `requester_id = user.id`
- Botao "Nova Solicitacao" aparece aqui
- Tabela com: Titulo, Status, Prioridade, Departamento, Data

**Aba "Recebidas":**
- Mostra solicitacoes que o usuario pode aprovar/gerenciar:
  - Gerente: solicitacoes `pending_manager` do seu departamento
  - Diretor: solicitacoes `pending_director` da empresa
  - Admin/Super Admin: todas as solicitacoes
  - HR: todas as solicitacoes (somente leitura)
  - Usuario comum: aba nao aparece (ou aparece vazia)
- Tabela com: Titulo, Status, Prioridade, Solicitante, Departamento, Data

### Detalhes Tecnicos

**Arquivo `src/pages/corp/Requests.tsx`:**
- Adicionar state `activeTab` com valores `'mine'` e `'received'`
- Usar componente `Tabs` do Radix para as 2 abas
- Filtrar `requests` por `requester_id === user.id` na aba "Minhas"
- Na aba "Recebidas", filtrar conforme role do usuario:
  - Para gerente: buscar `department_id` do departamento que ele gerencia (via `useDepartments`) e filtrar solicitacoes pendentes desse departamento
  - Para diretor: filtrar `status === 'pending_director'`
  - Para admin: mostrar todas exceto as proprias
- O botao "Nova Solicitacao" so aparece na aba "Minhas"
- Mover o `NewRequestDialog` para dentro do conteudo da aba "Minhas"

**Arquivo `src/hooks/useCorpRequests.ts`:**
- Nenhuma alteracao estrutural necessaria (ja retorna todas as solicitacoes visiveis via RLS)

**Arquivo `src/components/corp/NewRequestDialog.tsx`:**
- Renomear textos
- Tornar campo "Valor" opcional com label contextual

