# Situação dos testes: ainda não estão finalizados

Não. O que foi validado até agora, com evidência registrada no relatório de QA:

- Revalidação das 4 correções anteriores (embeds, relatórios técnicos, loop de renderização, papel duplicado).
- Escritas simples confirmadas na listagem: conta a pagar, conta a receber, tarefa comercial, oportunidade, cliente, ASO, requisição de compra, post no feed.
- Negativos de rota por papel (financeiro, comercial, técnico).
- Smoke test de carregamento das rotas.

Continua em aberto o QA funcional profundo (planejado como "QA funcional total") e, além dele, os módulos entregues depois daquele plano — que nunca passaram por teste: Ponto e Jornada (Onda 4), Control iD no Super Admin, Treinamentos (Onda 3), Benefícios e Endomarketing (Onda 5), Configurações Financeiras e Notificações multi-canal.

## Rodada proposta

### Bloco A — Destravar acessibilidade (pré-requisito)
Três gatilhos hoje não são alcançáveis por rótulo acessível e bloquearam cenários na rodada anterior: seletor de técnicos no formulário de OS, Sheet de Férias e Sheet de Solicitação Corporativa. Ajustar `aria-label`/rótulos consistentes nesses pontos.

### Bloco B — Fluxos multi-papel ponta a ponta (o que ficou pela metade)
1. Ciclo da OS: coordenador cria com técnico → técnico aponta horas e envia relatório → medição final com categoria de ISS e cálculo "por dentro" → finalização; técnico não acessa OS de outro.
2. Compras: total do gatilho conferido contra a soma dos itens → envio → aprovação do diretor → notificação ao solicitante; coordenador não aprova.
3. RH documental: colaborador cadastrado → documento obrigatório enviado → conformidade pendente → em revisão → aprovado → download pelo próprio colaborador (regressão do bug de bucket) → alerta de validade do ASO.
4. Comercial: lead → oportunidade → produto e valor → avanço de etapa → ganho → reflexo no dossiê e baixa de estoque.
5. Financeiro: baixa de pagamento e recebimento com status/valor pago; dashboard refletindo.
6. Corporativo: solicitação criada pelo colaborador → roteamento ao departamento → resposta do diretor → notificação in-app.

### Bloco C — Módulos novos (primeiro teste)
- **Ponto e jornada**: configuração de jornada, importação/registro de batidas, apuração do espelho no fuso de São Paulo (noturno, tolerância, feriado, férias), fechamento gerando crédito/débito no banco de horas, solicitação de ajuste pelo colaborador em `/corp/my-timesheet`, exportação para folha.
- **Control iD no Super Admin**: cadastro/edição de relógio por empresa, erro claro quando falta a senha do equipamento, RH em modo somente leitura com sincronização manual.
- **Treinamentos e competências**: lacunas vindas da matriz, plano criado e executado, KPIs de cobertura.
- **Benefícios e endomarketing**: benefício publicado, campanha com publicação automática no feed, visão do colaborador em `/corp/benefits`.
- **Configurações financeiras e notificações**: categorias, alerta de vencimento, preferências por canal e despacho in-app.

### Bloco D — Matriz de negação e asserção de banco
Cada papel tentando duas escritas proibidas e falhando no banco (não apenas por redirecionamento de rota), e conferência por consulta dos valores gravados (totais, status, vínculos) em todo registro criado nos blocos B e C.

### Bloco E — Encerramento
Atualizar o relatório de QA, e remover todos os registros marcados `[QA]` criados durante os testes.

Qualidade (SGQ) permanece fora do escopo, por conformidade ISO — nenhum registro fictício.

## Detalhes técnicos

- Scripts Playwright em `/tmp/browser/arrow-qa/e2e/<cenario>.py` reaproveitando `lib.py`; um contexto de navegador por papel, sessão restaurada antes de navegar para rotas autenticadas.
- Escritas sempre pela interface; leitura de conferência direto no banco ao fim de cada passo, comparando com o valor calculado no script.
- Coleta por passo: console, `pageerror`, respostas HTTP ≥ 400 e captura de tela.
- Empresa de testes: `[QA] Automação de Testes`.
