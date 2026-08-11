# Marina com paridade de ações do usuário

## Princípio

Marina deve poder fazer tudo que o usuário logado pode fazer nas telas, com as mesmas permissões (RLS/perfil) e sempre com confirmação antes de gravar. Hoje ela é majoritariamente de leitura: há escrita para apenas 14 entidades (OS, clientes, embarcações, oportunidades, tarefas CRM, compradores, produtos CRM, requisições de compra, NCR, auditorias, documentos da qualidade, solicitações corporativas, contas a pagar e a receber). O resto — itens de oportunidade, itens de venda, materiais de OS, medições, férias, exames, documentos e ausências de RH — ela só lê.

## O problema imediato


Você disse "oportunidade da Camorim solicitada pelo Cahuã" — informação suficiente. A Marina pediu o ID porque:

1. A ferramenta de oportunidades hoje busca **apenas pelo campo Título**. O título do registro é "RFQ pelo site — Cahuã", e o cliente "Camorim" está em outra tabela — então buscar "Camorim" não retorna nada e ela não tem nome de cliente nem responsável no resultado para conferir.
2. Ela **não tem nenhuma ferramenta para incluir/remover item em oportunidade**. Mesmo tendo achado o "KIT OVERHAUL STD22" no EVA, não existe caminho para gravá-lo — então a conversa trava pedindo dados.

## O que vou fazer

### 1. Busca de oportunidades mais inteligente
- Busca passa a considerar **nome do cliente, título, descrição, observações e responsável**, além do estágio.
- O resultado passa a trazer **cliente, comprador/contato, responsável, estágio, valor e idade** — o suficiente para ela dizer "achei esta, confirma?".
- Quando houver mais de uma candidata, ela lista as opções numeradas (cliente + título + estágio) e pergunta qual é, em vez de pedir ID.
- Quando houver exatamente uma candidata compatível, ela confirma em uma frase e segue.

### 2. Ferramentas de itens da oportunidade
- **Listar itens** de uma oportunidade (nome, código, quantidade, valor unitário e total).
- **Incluir item**: recebe a oportunidade e o produto do catálogo EVA, materializa o produto no espelho local se necessário e grava com código, nome, preço de tabela e quantidade — mesma regra usada pela tela de Itens, para os números fecharem no funil.
- **Remover item** com a confirmação em duas etapas já usada nas exclusões.
- Toda escrita continua respeitando as permissões do perfil (comercial/coordenação); se o perfil não puder, ela avisa em vez de tentar contornar.

### 3. Regra de comportamento no prompt
- Proibido pedir ID de registro ao usuário. Diante de uma referência em linguagem natural ("a da Camorim", "a do Cahuã"), ela **busca primeiro** e só pergunta para desempatar entre candidatas reais.
- Antes de gravar o item, resume em uma linha ("Incluo 1 × KIT OVERHAUL STD22 a R$ 4.212,60 na oportunidade RFQ pelo site — Cahuã / Camorim?") e executa após o "pode".
- Continuam valendo as regras anti-invenção do EVA: código, NCM, custo e preço apenas como vêm da consulta.

### 4. Paridade de ações nos demais módulos (mesma leva)
Fechar as lacunas de escrita onde a Marina hoje só lê, sempre limitada ao que o perfil do usuário já pode fazer na tela:
- **Comercial**: itens de venda, mover oportunidade de estágio, marcar ganha/perdida com motivo, criar/concluir tarefa, converter lead.
- **Operação (OS)**: vincular/retirar material da OS, criar e concluir tarefa da OS, alterar status e datas, lançar itens de medição.
- **RH**: solicitar/aprovar férias, registrar exame ocupacional, registrar ausência, atualizar validade e revisão de documento do colaborador.
- **Suprimentos/Financeiro/Qualidade**: itens de requisição de compra, baixa de contas, itens de plano de ação e fechamento de NCR.
- **Regra transversal**: toda ação de escrita passa por resumo + confirmação; exclusões seguem o fluxo de duas etapas com token; erro de permissão é informado ao usuário sem tentativa de contorno.
- Cada módulo ganha também a mesma desambiguação por linguagem natural (nome de cliente, número de OS, nome do colaborador) — nunca pedir ID.


## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts`: substituir o `basicQueryTool` de `crm_opportunities` por uma ferramenta dedicada com `select` incluindo `clients(name)`, `crm_buyers(name)` e `profiles(full_name)`; busca em `title/description/notes` mais resolução de `client_id` por nome do cliente (consulta em `clients` e filtro `in`). Novas ferramentas `list_opportunity_products`, `add_opportunity_product` e `remove_opportunity_product` operando em `crm_opportunity_products` (`opportunity_id`, `stock_product_id`, `item_name`, `item_code`, `quantity`, `unit_value`, `list_unit_value`, `total_value`), reaproveitando o leitor `_shared/eva-products.ts` e a materialização local do produto.
- `supabase/functions/ai-assistant/index.ts`: bloco de regras de desambiguação (nunca pedir ID) e de confirmação antes da escrita de itens; incluir as novas ferramentas nos módulos `crm_opportunities` para os perfis comercial, marketing, coordenador e diretor.
- Paridade dos demais módulos: estender o registro de escrita (`createFields`/`updateFields`) para as entidades filhas hoje ausentes (`crm_sale_items`, `os_materials`, `measurement_*`, `hr_vacation_requests`, `hr_health_exams`, `hr_employee_documents`, `absences`, `purchase_request_items`, `quality_action_items`) e adicionar ferramentas de transição de estado (mover estágio, concluir tarefa, dar baixa) onde a regra de negócio exige mais que um update simples. Sem alteração de RLS: as ferramentas rodam com o token do usuário, então a permissão real continua sendo a do banco.

- Deploy da função `ai-assistant` e teste do fluxo "inclui o kit overhaul na oportunidade da Camorim".
