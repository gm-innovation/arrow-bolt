# Espelho Omie/Auvo, Marina com acesso por papel, alertas WhatsApp + consolidação de setores

## Etapa 0 — Consolidação de setores administrativos + setor Diretoria

Contexto confirmado no banco: setor ≠ perfil. O vínculo automático papel → setor está inconsistente: `admin` → Administração, `manager` → Gerência (papéis legados que viraram o mesmo perfil operacional), `coordinator` → nenhum setor (bug), `director`/`super_admin` → nenhum setor. Nenhum nome de setor está fixo no código — tudo dinâmico, consolidação segura.

Decisões: consolidar Administração, Gerência e Coordenação em um único setor **Coordenação**; criar **Diretoria** apenas para o papel `director` (super admin sem setor).

Migration única:
1. Criar "Coordenação" e "Diretoria" idempotentemente em todas as empresas.
2. Migrar membros de Administração/Gerência → Coordenação (`department_members`, sem duplicar) e remover vínculos antigos.
3. Reapontar referências dos setores antigos em todas as tabelas com FK para `departments` (`profiles.department_id`, `corp_request_types.department_id`, `corp_documents.department_id` e demais).
4. Remover os setores "Administração" e "Gerência".
5. Backfill por papel: `coordinator`/`admin`/`manager` → Coordenação; `director` → Diretoria.
6. Atualizar `auto_assign_department_on_role` com o novo mapeamento (`super_admin` → sem setor).
7. Atualizar `seed_default_departments` (novas empresas nascem com Coordenação e Diretoria).

Verificação: dropdowns de Setor (novo usuário, RH, roteamento) mostram Coordenação e Diretoria; troca de papel realoca o setor automaticamente; Marina resolve "Coordenação"/"Diretoria" na ferramenta de solicitações.

## Etapa 1 — Espelho Omie → Arrow (OS criada no Omie nasce no Arrow)

Hoje o Omie é só leitura manual (consultar OS pelo número, sync de clientes, anexar relatório). Não há espelho automático.

1. Nova Edge Function `omie-sync`: lista OSs do Omie por período (paginação + cursores), cria/atualiza espelhos em `service_orders` (idempotente via chave externa do Omie), registrando cada execução em log de sync (padrão `auvo_sync_runs`).
2. Agendamento via `pg_cron` a cada 15 min + botão "Sincronizar agora" na área de integrações.
3. Atualizações no Omie refletidas no Arrow (upsert por chave externa: número da OS, cliente, status, datas, valor).

## Etapa 2 — Espelho Auvo contínuo (atualizações do Auvo refletidas no Arrow)

Hoje o `auvo-sync` é robusto mas disparado manualmente pela tela de auditoria.

1. Agendar execução automática do `auvo-sync` (cron incremental).
2. Reconciliar status das tarefas/relatórios Auvo com as `service_orders` espelho (andamento, conclusão, materiais).

## Etapa 3 — Marina lê Omie e Auvo com trava de papel

1. Nova ferramenta `query_omie_orders` na Edge Function `ai-assistant` (consulta OSs espelhadas do Omie por número, cliente, status, período).
2. Gating por papel: ferramentas Omie/Auvo/OSs liberadas para `director`, `super_admin` e `coordinator`; demais papéis recebem recusa educada.
3. Funciona igual no chat do sistema e no WhatsApp (mesma Edge Function; o papel já é verificado no servidor a cada mensagem).

## Etapa 4 — Alertas universais no WhatsApp

Infraestrutura já existe: `notify-dispatch`, fila `whatsapp_outbox`, tela de preferências em Configurações. Cobertura hoje é parcial.

1. Trigger em `notifications` (via `pg_net`) chamando o dispatcher para espelhar no WhatsApp todos os tipos de notificação: lead novo (comercial), solicitações internas entre setores, aprovações, avisos de RH etc.
2. Preferências: o canal WhatsApp passa a vir **ativado por padrão** quando o colaborador vincula o telefone; a tela de preferências existente continua permitindo desligar tipos individualmente (a área dedicada de escolha fina fica para uma etapa futura, como você antecipou).
3. Reuso do roteamento de identidade já implementado (`resolve_employee_by_phone`, precedência `profiles.phone`).

## Ordem sugerida de execução

Etapa 0 (rápida, independente) → Etapa 1 → Etapa 3 → Etapa 4 → Etapa 2.

## Notas técnicas

- Etapa 0: uma migration (dados + 2 funções `CREATE OR REPLACE`); sem tabela nova, sem GRANT/RLS adicionais.
- Etapa 1: `service_orders` ganha coluna de chave externa Omie (migration com GRANT/RLS não se aplica — alteração de tabela existente); credenciais Omie já criptografadas em `integration_settings`.
- Etapas 1/2: `pg_cron` + `pg_net` já disponíveis; padrão de idempotência igual ao `auvo-sync`.
- Etapa 4: trigger `AFTER INSERT` em `notifications` com filtro por tipo; dispatcher já consulta `notification_preferences`.
