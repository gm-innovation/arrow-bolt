# Integração Auvo — auditoria de materiais e espelho de OS

Objetivo: durante o período em que Auvo e Arrow rodam em paralelo, puxar as tarefas e os relatórios dos técnicos do Auvo, cruzar com os materiais liberados pelo EVA/Suprimentos para a mesma OS e apontar divergências. Além da auditoria, espelhar no Arrow a OS, cliente e embarcação vindos do Auvo (marcados como origem Auvo, sem se misturar com as OS nativas).

## Fase 0 — Descoberta com credenciais reais

Antes de fechar o modelo de dados, um script de sondagem autenticado lista alguns dias de tarefas e relatórios reais para confirmar: onde ficam os campos de relatório do técnico, se há questionário estruturado, como os materiais aparecem no texto livre, e qual campo do Auvo carrega o número da OS que casa com o EVA/Arrow. O resultado ajusta o mapeamento antes de qualquer escrita em massa.

## Fase 1 — Conexão e ingestão

- Credenciais `AUVO_API_KEY` e `AUVO_API_TOKEN` guardadas como segredos do backend (solicitados no momento certo, nunca no frontend).
- Edge Function `auvo-sync`: autentica (o token do Auvo expira em 30 min, então é renovado a cada execução), varre tarefas por período com paginação e respeita o limite de requisições do Auvo com espaçamento entre chamadas.
- Tabelas novas (todas com RLS por empresa):
  - `auvo_sync_runs` — cada execução: período, contagens, erros.
  - `auvo_tasks` — espelho da tarefa/OS: id Auvo, número da OS, cliente, embarcação, técnico, datas de check-in/check-out, status, payload bruto.
  - `auvo_task_reports` — relatório do técnico: texto, respostas de questionário, links de fotos/anexos.
  - `auvo_report_materials` — itens extraídos do relatório (nome, quantidade, unidade, confiança da extração).
  - `auvo_material_discrepancies` — resultado do cruzamento por OS e por item.
- Sincronização diária automática (job noturno puxando o dia anterior) e botão "Sincronizar agora" com escolha de período.

## Fase 2 — Extração dos materiais do texto livre

Como o técnico descreve os materiais em texto corrido, uma etapa de IA (Lovable AI Gateway) lê o relatório junto com a lista de materiais que o EVA registrou naquela OS e devolve, de forma estruturada, os itens citados com quantidade e o casamento com o item do estoque. O catálogo do EVA entra como referência, o que reduz erro de nome e permite marcar "citado sem quantidade" separadamente de "não citado".

## Fase 3 — Cruzamento e insights

Por OS, comparação item a item entre o que saiu do estoque (EVA/`os_materials`) e o que o relatório menciona, classificando cada linha como: confere, quantidade divergente, saiu do estoque mas não foi relatado, relatado mas não saiu do estoque, ou item não identificado. Além disso, indicadores de apoio: OS sem relatório, relatório sem material citado, técnicos e clientes com maior taxa de divergência, e valor financeiro em risco (custo dos materiais não relatados).

## Fase 4 — Tela de auditoria

Nova tela "Auditoria Auvo" acessível à coordenação (`/admin`) e à diretoria (`/manager`), com as mesmas permissões de leitura e ações de revisão:

- Cabeçalho com KPIs: OS sincronizadas, OS com divergência, itens não relatados, valor em risco.
- Lista de OS com filtro por período, cliente, técnico e severidade da divergência.
- Detalhe da OS lado a lado: materiais do EVA à esquerda, trecho do relatório do Auvo à direita, com marcação das divergências.
- Ação de revisão humana por linha: "confere", "divergência real" com observação — para que o número reportado seja confiável e não só o palpite da IA.
- Botão para promover a OS espelhada a OS nativa do Arrow quando a migração daquele cliente acontecer.

## Fase 5 — Espelho de OS no Arrow

As tarefas do Auvo alimentam cliente e embarcação no Arrow (criando se não existir, com deduplicação por documento/nome) e ficam disponíveis como OS de origem Auvo, sem entrar nos fluxos operacionais nativos (agenda técnica, medição) até serem promovidas explicitamente. Isso mantém histórico e relatórios consultáveis no Arrow durante o paralelo.

## Detalhes técnicos

- Base da API: `https://api.auvo.com.br/v2`; autenticação via `GET /login?apiKey=…&apiToken=…` retornando JWT de 30 minutos (sem refresh token — novo login quando expira); chamadas com `Authorization: Bearer`.
- Limite de 400 requisições/minuto: o sync usa paginação sequencial com espaçamento e retoma do último cursor gravado em `auvo_sync_runs` em caso de falha.
- Idempotência por `auvo_task_id` (upsert), para que resincronizações não dupliquem registros.
- Edge Functions registradas em `supabase/config.toml`; `auvo-sync` valida a sessão em código quando chamada pela tela e usa segredo compartilhado quando chamada pelo agendador.
- Toda tabela nova recebe `GRANT` explícito, RLS habilitado e políticas por `company_id`, com checagem de papel via função `SECURITY DEFINER`.
- Payload bruto do Auvo guardado em `jsonb` para reprocessar extrações sem novo consumo de API.

## Fora de escopo nesta etapa

Escrever de volta no Auvo (criar/alterar tarefas), migração definitiva de dados históricos e desligamento do Auvo.

## O que preciso de você

As credenciais do Auvo (API Key e API Token, em Menu > Integração no Auvo) para rodar a Fase 0 — vou solicitá-las pelo formulário seguro quando começarmos.
