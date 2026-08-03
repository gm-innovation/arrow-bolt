# QA funcional de verdade: fluxos ponta a ponta com verificação de efeito

## Resposta direta ao que foi feito até agora

A rodada anterior teve dois níveis, e nenhum dos dois prova "está funcionando":

1. **Smoke test (maior parte)** — abriu ~180 rotas em 9 papéis e checou apenas: a tela renderizou, sem erro de console, sem resposta HTTP ≥ 400. Isso detecta tela branca e query quebrada, nada mais.
2. **Fluxos de escrita (8 casos)** — preencheu formulário, salvou e conferiu que o registro apareceu na listagem. Mais forte, mas ainda parcial: não validou os valores gravados, nem regras de negócio, nem os passos seguintes do processo (aprovar, medir, faturar, notificar).

Ou seja: cobertura ampla e rasa. O que falta é cobertura profunda nos processos que importam.

## O que muda nesta rodada

Cada teste passa a ser um **cenário de negócio completo**, com asserção em três camadas:

```text
UI          o que o usuário vê depois da ação (listagem, status, totais, badge)
Banco       a linha realmente gravada, com os valores certos nas colunas certas
Efeito      o que a ação disparou: task criada, notificação, total recalculado,
            permissão liberada para o próximo papel
```

Um cenário só é aprovado se as três camadas conferirem. Se a UI diz "salvo" e o banco tem o valor errado, é bug.

## Cenários ponta a ponta

**1. Ciclo de vida da OS (o mais crítico)**
Coordenador cria cliente + embarcação → cria OS com tipo de tarefa e técnico → técnico vê a OS na própria área → inicia apontamento de horas → finaliza → envia relatório → coordenador inicia medição final → confere se as horas apontadas pelo técnico entraram na medição → aplica categoria de ISS → confere o cálculo "por dentro" → finaliza medição.
Verificações: horas somadas corretas, ISS conforme a fórmula da categoria, status da OS evoluindo, técnico sem acesso a OS de outro.

**2. Aprovação de compra (multi-papel)**
Suprimentos cria requisição com 2 itens → confere total calculado pelo trigger → envia para aprovação → diretor vê na fila de aprovação → aprova → status muda e o solicitante é notificado.
Verificações: total = soma dos itens, transição de status na ordem correta, coordenador **não** consegue aprovar.

**3. Admissão e conformidade documental (RH)**
RH cadastra colaborador → envia documento obrigatório do cargo → confere que o painel de conformidade muda de pendente para em revisão → aprova → colaborador vê o documento na própria área e consegue baixar (regressão do bug de bucket) → registra ASO com validade → confere o alerta de vencimento.

**4. Pipeline comercial**
Cria lead → converte em oportunidade → adiciona produto → confere valor total → avança etapa no Kanban → cria tarefa vinculada → marca ganho → confere reflexo no dossiê do cliente e na baixa de estoque quando aplicável.

**5. Financeiro**
Conta a pagar → baixa de pagamento → confere status e valor pago; conta a receber → recebimento; confere se o dashboard financeiro reflete os lançamentos.

**6. Corporativo e permissões**
Solicitação corporativa criada por um colaborador → roteamento para o departamento certo → resposta do diretor → notificação in-app chegando ao solicitante.
Matriz de negação: cada papel tenta 3 rotas de outros papéis e 2 escritas proibidas; todas devem falhar por RLS, não só por redirecionamento de rota.

Fora de escopo, como antes: módulo de Qualidade (ISO 9001), sem leitura nem escrita.

## Ajustes necessários no app para o teste ser confiável

A rodada anterior travou em componentes sem afordância acessível. Onde o teste não conseguir agir como um usuário conseguiria, a correção é no app, não no script:

- `aria-label` / rótulo acessível nos gatilhos de Sheet de Férias e Solicitação Corporativa.
- Rótulos de botão consistentes ("Nova/Novo ..."), para o teste alcançar por papel de acessibilidade.

Isso é acessibilidade real, não instrumentação de teste.

## Entrega

- Relatório por cenário: passo, esperado, obtido, evidência, e as três camadas de asserção.
- Bugs classificados em bloqueante / regra de negócio errada / permissão / cosmético.
- Correção dos bloqueantes e das regras de negócio erradas, com reexecução do cenário afetado.
- Atualização do PDF de QA com esta rodada.

## Detalhes técnicos

- Scripts em `/tmp/browser/arrow-qa/e2e/<cenario>.py`, um por cenário, encadeando logins de papéis diferentes em contextos separados de navegador.
- Asserção de UI por `expect`/estado, nunca por tempo fixo; asserção de banco por consulta de leitura ao final de cada passo, comparando valores esperados calculados no próprio script.
- Escritas sempre pela interface (exercita RLS e validação de formulário); a consulta ao banco serve só para conferir o resultado.
- Dados com prefixo `[QA]` na empresa de testes, limpos ao final na ordem inversa das dependências.
- Coleta por passo: console, `pageerror`, respostas ≥ 400 e captura de tela.
