## Diagnóstico revisado

Você está certo em desconfiar. A captura mostra que o dropdown continua puxando a tabela `clients` sem nenhum filtro de elegibilidade além da empresa. Além disso, a resposta real da tela `/commercial/opportunities` ainda retorna uma lista enorme de clientes, incluindo registros importados indevidamente ou sem classificação confiável.

O problema não é só “um nome específico”: o CRM hoje permite que qualquer registro em `clients` apareça em seletores comerciais, inclusive registros importados do ERP com CPF, pessoa física marcada como PJ, fornecedores/lojas genéricas e possíveis colaboradores.

## Plano de correção

### 1. Criar uma regra central de “cliente comercial válido”
- Adicionar no backend uma função/visão segura para listar apenas clientes elegíveis para CRM.
- Critérios iniciais:
  - mesma empresa do usuário;
  - excluir registros bloqueados/ignorados para uso comercial;
  - excluir nomes que colidam com colaboradores ativos;
  - tratar CPF como pessoa física e impedir que CPF marcado como PJ apareça como cliente corporativo por padrão;
  - manter exceções controladas para clientes PF quando forem realmente clientes.

### 2. Aplicar o filtro em todos os seletores comerciais
Substituir consultas diretas a `clients` por essa fonte central em:
- Oportunidades;
- Tarefas comerciais;
- Recorrências;
- Compradores/contatos;
- Relatórios comerciais;
- Leads/conversão em cliente quando aplicável;
- área comercial/admin equivalente.

### 3. Saneamento da base existente
- Marcar ou remover da seleção comercial registros que são colaboradores, fornecedores ou cadastros importados incorretamente.
- Corrigir `entity_type` para registros com CPF.
- Criar uma lista de bloqueio para nomes/documentos que não devem aparecer como clientes no CRM.
- Não apagar registros com histórico sem transferir vínculos antes.

### 4. Prevenção de reincidência
- Ajustar o processo de importação/sincronização para não transformar colaborador/fornecedor em cliente comercial selecionável.
- Reforçar trigger/regra de validação no backend para bloquear colisão com colaborador ativo.
- Padronizar criação manual de cliente para exigir tipo correto de pessoa.

### 5. Validação final
- Confirmar no banco que `CAHUA ARAUJO FERNANDES` e `CAIO REIS MARTINS DE VERAS` não existem mais como opção de cliente comercial.
- Abrir `/commercial/opportunities` e validar que o dropdown de Cliente não lista colaboradores.
- Validar os demais seletores do CRM para evitar correção parcial só na tela da imagem.

## Detalhes técnicos

- Vou evitar consultas diretas repetidas como `.from('clients').select('id, name')` nos seletores.
- A correção deve ser centralizada para não depender de lembrar de filtrar tela por tela.
- Como envolve backend/dados reais, a etapa de migração/saneamento precisará passar pela aprovação antes de executar.