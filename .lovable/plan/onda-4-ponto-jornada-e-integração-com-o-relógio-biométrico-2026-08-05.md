# Onda 4 — Ponto, jornada e integração com o relógio biométrico

Objetivo: transformar o ponto em fonte oficial da jornada, com espelho mensal fechável, banco de horas e aprovação de horas extras, alimentado automaticamente pelas batidas do relógio Control iD iDClass Bio Prox.

## 1. Integração com o Control iD

O iDClass expõe uma API REST própria (login por usuário/senha e leitura dos registros de acesso `access_logs`), e o iDSecure/Ponto iD expõe a mesma família de API no servidor. O Arrow vai consumir isso por uma função de backend que:

- guarda o endereço, usuário e senha do equipamento por empresa (senha em cofre de segredos, nunca no frontend);
- faz login, lê as batidas novas desde a última leitura e grava tudo em uma tabela de batidas cruas, sem apagar nada;
- casa cada batida com o colaborador por um novo campo "matrícula no relógio" no cadastro;
- roda automaticamente a cada 15 minutos e também por um botão "Sincronizar agora" na tela do RH;
- registra cada sincronização (quantas batidas, erros, batidas sem colaborador correspondente) para auditoria.

Ponto de atenção que muda o resultado: se o relógio e o iDSecure estiverem só na rede interna da empresa, o Arrow (que roda na nuvem) não alcança o equipamento. Nesse caso precisamos de uma das duas coisas, que dependem do TI da empresa: liberar um endereço público/VPN para o equipamento, ou usar a alternativa de importação de arquivo AFD. Vou construir a API como caminho principal e deixar a importação de AFD como plano B na mesma tela — assim a Onda 4 fica utilizável mesmo antes de o TI liberar o acesso.

## 2. Espelho de ponto e fechamento mensal

- Nova tela `/hr/timesheet`: escolhe mês e colaborador, mostra dia a dia — batidas do relógio, entrada/saída consideradas, intervalo, horas normais, extras, noturnas, sobreaviso, faltas, atrasos, feriados e férias já aprovadas.
- Cada dia aparece com o motivo do resultado (batida faltando, atraso, extra) e permite ajuste manual justificado, que fica registrado com autor e data.
- Fechamento do mês por colaborador: depois de fechado, o dia só muda reabrindo o período, e a exportação para folha passa a usar o fechado.
- Espelho em PDF para assinatura, no padrão dos relatórios que já existem.

## 3. Banco de horas

- Saldo por colaborador com extrato de lançamentos: crédito (extra trabalhada), débito (compensação, falta), ajuste manual.
- Regras configuráveis por empresa nas configurações de RH: jornada padrão, tolerância de atraso, janela do adicional noturno, se extra vira banco ou pagamento, prazo de vencimento do saldo.
- Aviso quando o saldo estiver perto de vencer.

## 4. Aprovação de horas extras

- Toda hora extra apurada entra como pendente e vai para aprovação do gestor/coordenador, depois do RH.
- Fila de aprovação com aprovar/recusar em lote e justificativa obrigatória na recusa.
- Só extra aprovada entra no fechamento e na exportação da folha.
- Notificações usam o despacho central já existente (in-app e push, e-mail quando o domínio estiver configurado).

## 5. Portal do colaborador

- Em `/corp`, o colaborador vê o próprio espelho do mês, saldo de banco de horas e pode pedir correção de batida, que cai na fila do RH.

## Detalhes técnicos

- Novas tabelas (todas com GRANT, RLS habilitada e políticas por `company_id`): batidas cruas do relógio, configuração do equipamento por empresa, log de sincronização, apuração diária, fechamento mensal por colaborador, lançamentos de banco de horas e aprovações de extra. Reaproveita `time_entries` e `hr_time_adjustments` para o que já existe, e novo campo de matrícula no relógio em `profiles`.
- Apuração diária em função de banco (`SECURITY DEFINER`) para que espelho, banco de horas e folha usem a mesma conta.
- Edge Functions novas registradas em `supabase/config.toml` com `verify_jwt = true`: sincronização do relógio, apuração/fechamento e importação de AFD. Agendamento por cron, no mesmo padrão de `finance-due-alerts`.
- Datas sempre com `parseISO`/construtor local; sem `new Date('YYYY-MM-DD')`.
- `hr-payroll-export` passa a ler o fechamento em vez de somar `time_entries` direto.

## O que preciso de você para a integração funcionar

Endereço IP/host do relógio ou do servidor iDSecure acessível de fora, usuário e senha de API (peço pelo cofre de segredos na hora certa), e a matrícula de cada colaborador no equipamento. Sem isso a tela funciona com AFD e ajuste manual.

## Fora de escopo

Cálculo de folha em si (continua exportação para o contador), módulo de Qualidade e voz full-duplex da Marina.
