# Revalidação das 4 correções + fluxos críticos de escrita

## Objetivo

1. Confirmar, com navegador real, que os 4 bugs corrigidos não voltam a ocorrer.
2. Executar os fluxos que gravam dados (criar/editar/excluir) em cada área, usando registros identificáveis e reversíveis.
3. Não tocar no módulo de Qualidade (ISO 9001) — nem leitura de escrita, nem criação de dados.

Ambiente: empresa `[QA] Automação de Testes` e um usuário por papel já criados.

## Etapa 1 — Revalidação das correções (somente leitura)

Roteiro curto, um login por papel, apenas nas rotas afetadas:

| Correção | Papel | Rota | Critério de aprovação |
|---|---|---|---|
| Embed `profiles → user_roles` | director | `/manager/reports` | sem 400/PGRST200; filtro de usuários lista nomes |
| Embed em telas de usuários | coordinator, commercial | `/admin/users`, `/commercial/admin/users` | lista carrega com coluna de função preenchida |
| `task_reports` sem join interno | technician | `/tech/dashboard`, `/tech/profile` | sem 400; contador de relatórios exibido |
| Loop de render | coordinator | `/admin/employee-documents` | sem "Maximum update depth"; busca e "Expandir todos" funcionam |
| Papel duplicado (406) | marketing | `/commercial/dashboard`, `/corp/feed` | permanece no dashboard comercial; feed sem 406 |

Cada rota é verificada por: ausência de erro no console, ausência de resposta HTTP >= 400 do backend, e captura de tela como evidência.

## Etapa 2 — Fluxos críticos de escrita

Todo registro criado leva o prefixo `[QA]` no campo de nome/título e é removido no final (ou marcado como cancelado quando não houver exclusão). Cada fluxo é: criar → conferir na listagem → editar → conferir → excluir/cancelar.

- **Coordenador**: cliente, embarcação, ordem de serviço com técnico atribuído, reserva de técnico.
- **Técnico**: aceitar/atualizar tarefa da OS criada acima, iniciar e finalizar apontamento de horas, enviar relatório simples.
- **RH**: colaborador (cadastro unificado), documento anexado ao colaborador com download, exame ocupacional (ASO), solicitação de férias.
- **Comercial**: lead, oportunidade com produto, tarefa comercial, avanço de etapa da oportunidade.
- **Financeiro**: conta a pagar, conta a receber, baixa de pagamento.
- **Compras**: requisição de compra com itens e envio para aprovação.
- **Diretor**: aprovação da requisição de compra e de uma solicitação corporativa criadas nos fluxos acima.
- **Corporativo (qualquer papel)**: solicitação corporativa, post no feed com comentário, atualização do próprio perfil.

Casos negativos verificados no mesmo passe: técnico não consegue criar OS; comercial não acessa área financeira; coordenador não aprova requisição que exige diretor.

## Etapa 3 — Limpeza e relatório

- Remoção dos registros `[QA]` criados (ordem inversa das dependências), mantendo a empresa e os usuários de teste para execuções futuras.
- Relatório em `docs/qa/relatorio-testes.md`: tabela por papel/fluxo com resultado, evidências e lista de bugs priorizados.
- Bugs encontrados são corrigidos em seguida e o fluxo correspondente é reexecutado.

## Detalhes técnicos

- Scripts Playwright em `/tmp/browser/arrow-qa/`: `revalidate.py` (Etapa 1) e `flows/<papel>.py` (Etapa 2), com login real por e-mail/senha do usuário QA correspondente.
- Coleta por página: eventos `console`, `pageerror` e respostas HTTP do backend com status >= 400; captura de tela em qualquer falha.
- Seletores por papel acessível (`get_by_role`, `aria-label`) e espera por asserção de estado, sem tempos fixos.
- Escritas feitas apenas pela interface (nunca SQL direto), para exercitar RLS e validações de formulário do mesmo jeito que o usuário final.
- A limpeza usa a própria interface quando existe exclusão; quando não existe, o registro fica com status cancelado/inativo e é listado no relatório.
- Rotas `/quality/*` e qualquer tabela do SGQ ficam fora do escopo dos dois scripts.
