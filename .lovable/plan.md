# Ponto automático via nuvem RHiD (sem trabalho manual do RH)

O relógio (REP iDClass, 10.10.0.101) está na rede interna, então o backend na nuvem não fala direto com ele. Mas o equipamento está com **iDCloud habilitado** e já envia tudo para o portal `rhid.com.br` — e é lá que o Arrow vai buscar as batidas, automaticamente, sem ninguém baixar arquivo.

## Como vai funcionar

1. Guardamos como segredo do sistema o login da conta RHiD (o mesmo do portal que você mostrou) — nunca no cadastro nem no código.
2. Uma rotina no backend autentica no RHiD, baixa as batidas novas (via API do portal ou o mesmo download de AFD que o portal faz, executado pelo servidor) e grava no Arrow.
3. A rotina roda sozinha algumas vezes por dia; o RH também pode clicar em "Sincronizar agora".
4. As batidas caem na apuração de ponto que já existe (espelho, banco de horas, portal do colaborador).

O RH não baixa nem importa nada. Se um dia a nuvem falhar, a importação manual de AFD continua como plano B.

## Primeiro passo: descobrir o contrato da API

Não localizei documentação pública dos endpoints do RHiD. Então a primeira etapa é confirmar, com a sua conta, quais chamadas o portal usa:

- Abrir primeiro o menu **Integração** e a tela **Monitoramento iDCloud** do portal: é o lugar mais provável de haver chave/token de API, webhook ou envio automático de marcações. Se houver, é esse o caminho oficial e o mais estável.
- Se não houver token ali, fazer login no `rhid.com.br` de forma automatizada e capturar as requisições de autenticação e de "Baixar AFD do REP" / relatório de marcações (URL, cabeçalhos, formato da resposta).
- Só depois disso codifico o conector — assim ele nasce alinhado ao que o portal realmente expõe, sem chute.

Se o RHiD oferecer token de API dedicado, uso o token em vez de usuário/senha (mais seguro e estável).

## Ajuste no cadastro do relógio

O cadastro atual passa a distinguir duas formas de coleta:

- **Nuvem RHiD** (novo padrão): endereço do portal + conta RHiD. Não depende da rede da empresa.
- **Equipamento local**: só funciona se o relógio for publicado na internet — fica disponível, mas marcado como opcional.

Também deixo claro na tela que "Nome do segredo da senha" recebe o **nome do segredo** (ex.: `RHID_PASSWORD`), não a senha — foi o que causou o erro 502 de hoje.

## Detalhes técnicos

- Novo módulo `supabase/functions/_shared/rhid.ts`: login, listagem de marcações e/ou download de AFD, com retry e paginação por data.
- `hr_timeclock_devices` ganha `integration_kind = 'rhid_cloud'` e campos de conta (`account_login`, `password_secret_name`); `base_url` valida esquema `http(s)://`.
- `hr-timeclock-sync` passa a rotear por `integration_kind`: `rhid_cloud` (nuvem), `api` (Control iD direto na LAN), `afd` (arquivo). Reaproveita `parseAfd` já existente e a deduplicação por NSR/matrícula.
- Segredo `RHID_PASSWORD` (ou `RHID_API_TOKEN`) solicitado em formulário seguro na etapa de implementação.
- `pg_cron` + `pg_net` chamando a função 3x/dia com `x-cron-secret`; logs em `hr_timeclock_sync_logs`.
- Vínculo colaborador ↔ matrícula continua no RH (`/hr/timesheet`), e a configuração do equipamento no Super Admin.
