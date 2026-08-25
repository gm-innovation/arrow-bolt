# Marina sempre na fonte mais atualizada (e sincronizando quando detecta atraso)

## Por que deram 64 e 74 (verificado no banco)

- A sincronização do Omie roda a cada ~15 min e está com status "success".
- Porém, no último ciclo ela **listou 5.042 OSs no Omie e gravou apenas 4.584**: **457 OSs foram descartadas por "cliente não encontrado"** no Arrow (`skipped_no_client: 457`, `skipped_invalid: 0`, zero erros).
- Ou seja: o espelho local não está atrasado — ele está **incompleto por regra própria**. Das 457 descartadas, 10 foram faturadas neste mês. Daí 64 (espelho) contra 74 (Omie ao vivo).
- Hoje a Marina **não tem nenhuma ferramenta de sincronização**: ela só lê o espelho ou consulta o Omie ao vivo; não consegue mandar atualizar o Arrow.

## O que vou fazer

### 1. Parar de descartar OSs sem cliente (causa raiz)
- Na sincronização do Omie, quando o cliente da OS não existir no Arrow, **criar/vincular o cliente automaticamente** a partir dos dados do próprio Omie (código Omie, nome/razão social, documento) em vez de descartar a OS.
- Se ainda faltar dado essencial, a OS passa a ser gravada com cliente pendente de identificação e fica marcada como tal — nunca mais simplesmente ignorada.
- Backfill único das OSs hoje ausentes (as ~457), incluindo as 10 faturadas do mês.
- O log de sincronização passa a registrar quantas OSs foram recuperadas e quantas continuam pendentes, para essa divergência ficar visível.

### 2. Marina pode disparar sincronização
- Nova ação para a Marina: **sincronizar agora** (Omie e/ou Auvo), disponível para diretor, super admin e coordenador.
- Uso automático: ao detectar divergência entre a fonte e o Arrow, ela **avisa, sincroniza e responde com o número correto** na mesma conversa — sem perguntar "como deseja prosseguir".
- Proteção contra abuso: uma sincronização por origem a cada poucos minutos; se já houver uma em andamento, ela informa e usa o dado ao vivo enquanto isso.

### 3. Regra de fonte: origem manda quando o dado é da origem
- Para faturamento, etapa da OS e valores (dados que nascem no Omie), a resposta padrão passa a ser **conferida na origem**: consulta ao Omie ao vivo e comparação com o espelho.
- Quando os números batem, ela responde direto e cita que está conferido com o Omie.
- Quando divergem, ela responde com o número da origem, informa a diferença e dispara a sincronização do Arrow.
- Para dados de campo (check-in/check-out, relato, equipe), a mesma regra vale com o Auvo; para estoque, com o EVA.
- Se a origem estiver fora do ar ou lenta, ela responde com o espelho e diz claramente que é o dado do sistema com a hora da última sincronização.

### 4. Transparência de frescor
- Toda resposta com número consolidado passa a poder informar a hora da última sincronização da origem correspondente.
- Divergências relevantes ficam registradas para acompanhamento (quantas OSs faltavam, quais).

### 5. Ela avisa o que está fazendo (nada de parecer travada)
- Quando uma ação for demorar (consulta ao Omie ao vivo, sincronização, varredura de páginas), a Marina manda **antes** uma mensagem curta de andamento: "detectei dados novos no Omie, estou sincronizando com o Arrow e já volto com o número".
- Se a operação passar de um limite (ex.: 20s), ela manda um segundo aviso de progresso ("ainda sincronizando, página 6 de 11").
- Ao terminar, ela **obrigatoriamente entrega o resultado** na mesma conversa, referenciando o aviso ("como avisei, sincronizei: são 74 faturadas neste mês").
- No WhatsApp o aviso vai como mensagem separada; no chat web, como um bloco de andamento acima da resposta, que é substituído pelo resultado.

### 6. Continuar conversando enquanto ela trabalha
- Hoje o chat web **bloqueia** a caixa de mensagem enquanto ela pensa (botão e campo desabilitados) — ou seja, não é possível mandar outra coisa no meio.
- Vou liberar: a caixa continua ativa, novas mensagens entram numa fila da conversa e são respondidas em ordem, sem cancelar o trabalho em andamento.
- Tarefas longas (sincronizações, consultas ao vivo) passam a rodar como **tarefa em andamento** com identificador próprio: a resposta chega quando ficar pronta, mesmo que o usuário já tenha mandado outras perguntas no meio.
- Se o usuário pedir para parar, ela cancela a tarefa em andamento.
- No WhatsApp o comportamento é naturalmente assíncrono: mensagens novas são atendidas e a resposta da tarefa longa chega quando concluir.

### 7. Marina no grupo de WhatsApp da empresa
- Hoje toda mensagem de grupo é **descartada** pelo webhook (grupos e transmissões são ignorados). Vou habilitar grupos.
- Regra de convívio no grupo: ela só responde quando for **mencionada** (@Marina) ou quando responderem a uma mensagem dela — para não poluir a conversa.
- Permissões: cada resposta usa o perfil do **autor da mensagem** (identificado pelo telefone no cadastro). Se o autor não for colaborador reconhecido, ela não responde no grupo.
- Cuidado com dados sensíveis: em grupo ela **não** expõe dado pessoal de colaborador (documento, salário, ficha, endereço) nem conteúdo restrito ao papel; nesses casos responde no grupo dizendo que vai tratar no privado e manda o conteúdo na conversa individual de quem pediu.
- Grupos autorizados ficam sob controle: apenas grupos habilitados pela empresa são atendidos.

### 8. Áudio no WhatsApp (ouvir e responder falando)
- Mensagens de voz recebidas passam a ser baixadas, transcritas e tratadas como texto normal (mesmo entendimento, mesmas ferramentas).
- Se a transcrição falhar ou o áudio estiver inaudível, ela pede para repetir em texto.
- Resposta em áudio: quando o usuário mandar áudio, ela responde em áudio (voz da Marina já configurada) com um resumo em texto acompanhando, para ficar consultável.
- Preferência por usuário: responder sempre em texto, sempre em áudio, ou espelhar o formato recebido (padrão).
- Áudio muito longo ou resposta muito longa: ela envia texto e um áudio resumido, para não gerar mensagens de voz intermináveis.


## Detalhes técnicos

- `supabase/functions/omie-sync/index.ts`: substituir o descarte por `skipped_no_client` por resolução/criação de cliente (upsert em `clients` por `omie_client_id`/documento, com `company_id`), contabilizando `clients_created` e `pending_client` nas estatísticas gravadas em `crm_integration_logs`. Backfill executado por uma passada completa após o ajuste.
- `supabase/functions/ai-assistant/`: nova ferramenta `run_integration_sync` (origens `omie` | `auvo`), invocando as funções de sincronização com o segredo de agendamento e devolvendo o resumo; registrar nos módulos de `director`, `super_admin` e `coordinator`. Throttle por `crm_integration_logs` (última execução por origem).
- `insights.ts`: `get_os_billing_summary` passa a fazer, por padrão, comparação espelho × Omie ao vivo (`compare`), devolvendo `divergencia` e `ultima_sincronizacao`; em divergência, o loop de ferramentas encadeia `run_integration_sync` antes da resposta final.
- `ai-assistant/index.ts`: ajustar as instruções N3/N4 para "origem manda" nos dados de Omie/Auvo/EVA, obrigação de sincronizar ao detectar atraso e proibição de pedir autorização.
- Sem tabela nova, portanto sem mudança de RLS. Deploy de `omie-sync` e `ai-assistant`, com validação das perguntas de faturamento do mês e de OS ausente no espelho.
