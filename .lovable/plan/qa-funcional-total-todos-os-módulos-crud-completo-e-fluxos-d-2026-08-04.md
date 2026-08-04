# QA funcional total: todos os módulos, CRUD completo e fluxos do colaborador

Você está certo: o que foi fechado até agora é o ciclo da Ordem de Serviço. O restante da Coordenação, o Comercial/Marketing inteiro, o RH além do documental, o Corporativo (feed, universidade, grupos, solicitações) e o Financeiro ainda não foram testados em profundidade. Esta rodada cobre tudo, módulo por módulo, com CRUD completo (criar, ler, editar, excluir) e verificação em três camadas (interface, banco, efeito colateral).

Escopo total: 207 rotas mapeadas. Qualidade (SGQ) segue fora, por conformidade ISO — nenhum registro fictício.

## Padrão de teste aplicado a cada entidade

```text
Criar    pela interface, com campos obrigatórios e opcionais
Ler      aparece na listagem, filtros e busca funcionam
Editar   alterar 2 campos e confirmar persistência
Excluir  remover e confirmar remoção (ou bloqueio correto quando há vínculo)
Banco    conferir por consulta os valores gravados nas colunas certas
Efeito   totais recalculados, notificação, XP, status do próximo papel
```

## Bloco 1 — Coordenação (fechar o que falta)

- **Clientes**: CRUD completo + endereços, contatos, entidades legais (CNPJ), compradores, vínculo contato–embarcação, grupo de clientes (cliente-pai), busca automática de CNPJ.
- **Embarcações**: CRUD, vínculo a cliente, uso em OS.
- **Tipos de tarefa e serviços**: CRUD e reflexo na criação de OS.
- **Checklists**: criar modelo com itens, aplicar em tarefa, responder, conferir respostas gravadas.
- **Calendário, escalas e reservas**: criar reserva de técnico, conferir bloqueio de disponibilidade, ausências e conflitos.
- **Transferências de técnico**, **histórico**, **localizações**, **configurações de medição**, **documentos de colaboradores**, **logs de auditoria**.
- **Leads e oportunidades na visão do coordenador** (CRM de serviço compartilhado).

## Bloco 2 — Comercial e Marketing (módulo inteiro, não só pipeline)

- **Leads do site** (`site-leads`) → conversão em oportunidade.
- **Oportunidades**: CRUD, produtos vinculados, valor total, atividades, transferência entre responsáveis, avanço de etapa, ganho/perda.
- **Vendas**: criar venda com itens, confirmar, conferir baixa de estoque.
- **Produtos e estoque**: CRUD, lead time, alerta de estoque.
- **Compradores e contatos**: CRUD e vínculo a cliente.
- **Recorrências**: modelo, recorrência por cliente, geração de oportunidade e aviso antecipado.
- **Base de conhecimento** e **documentos de referência**: CRUD, segmentação, versão e tags.
- **Dossiê do cliente**: 5 abas conferidas contra os dados criados.
- **Importação e integração Omie**: importação, logs de integração, blocklist, tratamento de erro.
- **IA Insights**, **relatórios**, **medições na visão comercial**, **agendas**, **usuários**, **serviços**.

## Bloco 3 — RH completo

- **Colaboradores**: cadastro unificado, hierarquia (gestor), dossiê, notas administrativas, edição e desligamento.
- **Recrutamento**: vaga publicada → página pública de carreira → candidatura → etiquetas, notas, movimentação de etapa → contratação.
- **Onboarding**: gerar link público por token, candidato externo enviando documentos, tipos de documento, aprovação pelo RH, configurações.
- **Universidade Corporativa**: criar curso e trilha, colaborador concluir, certificado gerado (layout e logo), XP e badge atribuídos, post automático no feed, configurações de recompensa.
- **Documental**: catálogo por cargo, upload, painel de conformidade (pendente → em revisão → aprovado), download pelo próprio colaborador, compartilhamento de pacote com finalidade e expiração, log de acesso.
- **SST**: ASO com validade e alerta de vencimento, EPI (item, estoque, entrega, movimentação).
- **Férias e ausências**: solicitação → aprovação do gestor → aprovação do RH → saldo e período atualizados; home office, feriados, plantão.
- **Ponto e folha**: controle de horas, ajustes de ponto, exportação para folha, reembolsos.
- **Parcerias e benefícios**, **relatórios de RH**, **configurações**.

## Bloco 4 — Corporativo (todos os colaboradores)

- **Feed**: post em texto, com anexo, com enquete; curtir, comentar, mencionar; discussões de longo prazo; layout responsivo.
- **Grupos**: grupo manual e automático, pedido de entrada, aprovação, discussões internas.
- **Solicitações corporativas**: criação por colaborador → roteamento ao departamento correto → resposta do diretor → notificação in-app ao solicitante; aba Recebidas; tipos de solicitação e anexos privados.
- **Documentos corporativos** e encaminhamento por departamento.
- **Perfil público, celebrações, kudos, badges e ranking de XP**.
- **Chat interno** e **Marina** (resposta em texto, ação auditada).
- **Minha conta**: perfil, configurações, meus chamados.

## Bloco 5 — Compras, Financeiro, Diretoria

- **Compras**: requisição com 2 itens → total do gatilho conferido → envio → aprovação do diretor → status na ordem correta → notificação; coordenador **não** aprova.
- **Financeiro**: categorias, conta a pagar e a receber com baixa (status e valor pago), transações, reembolsos, dashboard e relatórios refletindo os lançamentos.
- **Diretoria**: fila de aprovações, visão de coordenadores, produtividade, relatórios estratégicos.
- **Super Admin**: empresas, usuários, assinaturas, PM Dashboard, inbox de suporte, walkthroughs, API docs.

## Bloco 6 — Matriz de permissões (RLS de verdade)

Para cada um dos 9 papéis: 3 rotas de outros papéis (redirecionamento) **e** 2 escritas proibidas executadas pelo cliente do banco, que devem falhar por política, não só por rota. Inclui tentativa de leitura de dados de outra empresa.

## Entrega

- Relatório por bloco: passo, esperado, obtido, evidência, e as três camadas de asserção.
- Bugs classificados em bloqueante / regra de negócio / permissão / cosmético; correção dos dois primeiros com reexecução do fluxo afetado.
- Atualização de `docs/qa/relatorio-testes.md` e do PDF de QA.
- Limpeza dos registros `[QA]` na ordem inversa das dependências.

## Detalhes técnicos

- Scripts Playwright em `/tmp/browser/arrow-qa/e2e/<bloco>-<entidade>.py`, reaproveitando `lib.py`; um contexto de navegador por papel.
- Escritas sempre pela interface (exercita RLS e validação de formulário); consulta de leitura ao banco só para conferir o resultado.
- Asserção por estado, nunca por tempo fixo; coleta por passo de console, `pageerror`, respostas ≥ 400 e captura de tela.
- Onde um gatilho não for alcançável por papel de acessibilidade, a correção é no app (`aria-label`/rótulo), não no script.

## Ordem de execução sugerida

1. Coordenação (CRUD base, destrava o resto)
2. Comercial/Marketing
3. RH completo
4. Corporativo e feed
5. Compras, Financeiro, Diretoria, Super Admin
6. Matriz de permissões, relatório e limpeza
