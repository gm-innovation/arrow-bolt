# Ponto automático via nuvem RHiD (sem trabalho manual do RH)

O relógio (REP iDClass, 10.10.0.101) está na rede interna, então o backend na nuvem não fala direto com ele. Mas o equipamento está com **iDCloud habilitado** e já envia tudo para o portal `rhid.com.br` — e é lá que o Arrow vai buscar as batidas, automaticamente, sem ninguém baixar arquivo.

## Como vai funcionar

1. Guardamos como segredo do sistema o login da conta RHiD (o mesmo do portal que você mostrou) — nunca no cadastro nem no código.
2. Uma rotina no backend autentica no RHiD, baixa as batidas novas (via API do portal ou o mesmo download de AFD que o portal faz, executado pelo servidor) e grava no Arrow.
3. A rotina roda sozinha algumas vezes por dia; o RH também pode clicar em "Sincronizar agora".
4. As batidas caem na apuração de ponto que já existe (espelho, banco de horas, portal do colaborador).

O RH não baixa nem importa nada. Se um dia a nuvem falhar, a importação manual de AFD continua como plano B.

## Primeiro passo: descobrir como o portal entrega as batidas (com Playwright)

Sem token de API ainda, o caminho é engenharia reversa do próprio portal. Eu uso o Playwright aqui, no ambiente de desenvolvimento, só para **descobrir o contrato** — ele não faz parte da integração final:

- Abrir o `rhid.com.br`, fazer login com a sua conta e olhar o menu **Integração** e a tela **Monitoramento iDCloud**: é o lugar mais provável de existir chave/token de API, webhook ou envio automático de marcações. Se houver, esse é o caminho oficial e paramos a engenharia reversa aqui.
- Se não houver token, gravar as requisições que o portal faz no login e em "Baixar AFD do REP" / relatório de marcações: URL, método, cabeçalhos, cookies de sessão e formato da resposta.
- Com esse mapa, escrevo o conector no backend usando chamadas HTTP diretas (sem navegador), que é o que roda em produção.

Para essa etapa preciso das credenciais do portal, que eu peço em formulário seguro e guardo como segredo — não ficam no chat nem no código.

Por que não usar Playwright em produção: as funções do backend não rodam navegador, e automação de tela quebra a cada mudança de layout do portal. Playwright serve para descobrir e para validar; a coleta diária é HTTP puro.


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
