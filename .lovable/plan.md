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

## Detalhes técnicos

- `supabase/functions/omie-sync/index.ts`: substituir o descarte por `skipped_no_client` por resolução/criação de cliente (upsert em `clients` por `omie_client_id`/documento, com `company_id`), contabilizando `clients_created` e `pending_client` nas estatísticas gravadas em `crm_integration_logs`. Backfill executado por uma passada completa após o ajuste.
- `supabase/functions/ai-assistant/`: nova ferramenta `run_integration_sync` (origens `omie` | `auvo`), invocando as funções de sincronização com o segredo de agendamento e devolvendo o resumo; registrar nos módulos de `director`, `super_admin` e `coordinator`. Throttle por `crm_integration_logs` (última execução por origem).
- `insights.ts`: `get_os_billing_summary` passa a fazer, por padrão, comparação espelho × Omie ao vivo (`compare`), devolvendo `divergencia` e `ultima_sincronizacao`; em divergência, o loop de ferramentas encadeia `run_integration_sync` antes da resposta final.
- `ai-assistant/index.ts`: ajustar as instruções N3/N4 para "origem manda" nos dados de Omie/Auvo/EVA, obrigação de sincronizar ao detectar atraso e proibição de pedir autorização.
- Sem tabela nova, portanto sem mudança de RLS. Deploy de `omie-sync` e `ai-assistant`, com validação das perguntas de faturamento do mês e de OS ausente no espelho.
