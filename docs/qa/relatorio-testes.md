# Relatório de QA — revalidação e fluxos de escrita

Data: 2026-08-03 · Ambiente: preview local, empresa `[QA] Automação de Testes`
Escopo: todos os papéis, exceto módulo de Qualidade (SGQ), mantido fora dos testes.

## Etapa 1 — Revalidação das 4 correções

| Correção | Papel / rota | Resultado |
|---|---|---|
| Embed `profiles → user_roles` | director · `/manager/reports` | OK — sem erros de console nem respostas HTTP ≥ 400 |
| Embed em telas de usuários | commercial · `/commercial/admin/users` | OK — lista carrega com funções |
| `task_reports` sem join interno | technician · `/tech/dashboard`, `/tech/profile` | OK — sem erro 400 |
| Loop de renderização | coordinator · `/admin/employee-documents` | OK — busca funciona, sem "Maximum update depth" |
| Papel duplicado (406) | marketing · `/commercial/dashboard`, `/corp/feed` | OK — permanece no painel comercial, feed sem 406 |

Observação: `/admin/users` não existe como rota (a tela de usuários do operacional fica em `/commercial/admin/users`); o redirecionamento para `/admin/dashboard` é comportamento correto.

## Etapa 2 — Fluxos de escrita

| Papel | Fluxo | Resultado |
|---|---|---|
| Financeiro | Criar conta a pagar `[QA] Fornecedor Teste` | OK — aparece na listagem |
| Financeiro | Criar conta a receber `[QA] Cliente Teste` | OK |
| Comercial | Criar tarefa comercial `[QA] Tarefa comercial` | OK |
| Comercial | Criar oportunidade `[QA] Oportunidade` com cliente | OK |
| Coordenador | Criar cliente `[QA] Cliente Coordenacao` | OK — confirmado na listagem |
| RH | Registrar exame ocupacional (ASO) | OK — gravado sem erro |
| Compras | Criar requisição de compra com item | OK — aparece na listagem |
| Corporativo | Publicar post no feed (comercial e técnico) | OK após correção (ver abaixo) |

### Casos negativos (todos aprovados)

- Financeiro não acessa `/admin/orders` (redirecionado ao próprio painel).
- Comercial não acessa `/finance/*`.
- Técnico não acessa `/admin/orders`.

## Bug encontrado e corrigido

**Feed corporativo bloqueado para a maioria dos papéis (403).** O compositor de posts era exibido a todos, mas as regras de acesso só permitiam publicar a administradores, super administradores e RH. Comercial e técnico recebiam erro 403 ao publicar.
Correção aplicada: qualquer colaborador da empresa pode publicar; cada pessoa edita/remove os próprios posts; administradores, super administradores e RH seguem podendo moderar qualquer post. Revalidado com comercial e técnico — publicação bem-sucedida.

## Pendências para a próxima rodada

- Fluxo de OS completo (coordenador cria OS → técnico apontamento/relatório): formulário mapeado, execução não concluída nesta rodada.
- Aprovação de requisição de compra pelo diretor e solicitação corporativa (botão de criação não localizado por seletor acessível em `/corp/requests` e `/hr/vacations` — investigar rótulo/afordância).
- Limpeza dos registros `[QA]` criados (contas a pagar/receber, tarefa, oportunidade, cliente, ASO, requisição de compra, posts do feed).

## Evidências

Capturas em `/tmp/browser/arrow-qa/` (`reval/screens`, `flows/out/screens`) e resultados JSON em `flows/out/results*.json`.
