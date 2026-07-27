## Contexto

Hoje `hr_employee_documents` só é lido por próprio colaborador, gestor direto, RH, Diretor e Super Admin. Coordenadores precisam acessar documentos de **qualquer colaborador** (técnico, comercial, marketing, engenharia, etc.) para:
- Autorização de entrada em estaleiros/portos/navios
- Reserva de passagens/hospedagem
- Documentação de embarque

Regra: **acesso amplo, mas controlado pelo RH** — nada de vincular a OS/reserva. O RH decide, por colaborador e por tipo de documento, o que pode ser compartilhado com coordenadores.

## Arquitetura: Autorização em dois eixos, controlada pelo RH

O acesso do coordenador a um documento existe **se e somente se** os dois eixos estão marcados como compartilháveis:

1. **Eixo tipo (catálogo)** — `hr_document_catalog.coordinator_shareable` (bool). RH marca globalmente quais tipos podem ser compartilhados (ex.: RG, CPF, CNH, Passaporte, ASO vigente, NRs). Holerite, contrato, exame detalhado nunca são marcados.
2. **Eixo pessoa (colaborador)** — nova tabela `hr_coordinator_document_grants` mapeando `(employee_id, catalog_id)`. RH decide, por pessoa, quais tipos autorizados do catálogo ficam expostos aos coordenadores. Um colaborador pode ter só RG+CPF liberados; outro pode ter tudo.

Assim o RH pode, por exemplo, liberar CNH+Passaporte da Ana (engenharia) para viagem e ao mesmo tempo manter todos os documentos do Pedro (marketing) fechados.

Opcional prático: switch "Liberar todos os tipos compartilháveis deste colaborador" em massa (cria uma linha por catálogo `coordinator_shareable=true`).

### Pacotes de compartilhamento externo (finalidades específicas)

Para documentar **para quem** o coordenador está encaminhando (estaleiro X, cia aérea Y) e ter rastro auditável e temporal, mantém-se a estrutura de "pacotes":

- Coordenador cria pacote com colaborador(es), finalidade, destinatário, docs escolhidos, expiração e justificativa.
- **Não exige aprovação do RH** para docs já autorizados nos dois eixos — o RH já pré-autorizou.
- Se o coordenador escolher um doc **não** autorizado, o pacote entra em `pending` e vai para o RH aprovar. Aprovação cria o grant automaticamente (`persist_grant=true`).
- Pacote registra acessos e expira automaticamente.

## Modelo de dados

**Alteração**
- `hr_document_catalog`: `+ coordinator_shareable boolean default false`

**Novas tabelas**
- `hr_coordinator_document_grants` — id, company_id, employee_id (FK profiles), catalog_id (FK catálogo), granted_by (RH), granted_at, revoked_at, note. Unique `(employee_id, catalog_id) where revoked_at is null`.
- `hr_document_share_packages` — id, company_id, requested_by (coordenador), purpose (enum), recipient_name, recipient_client_id nullable, justification, status (`active`|`pending_review`|`rejected`|`revoked`|`expired`), reviewed_by, reviewed_at, review_notes, expires_at.
- `hr_document_share_package_targets` — id, package_id, employee_id.
- `hr_document_share_items` — id, package_id, employee_id, document_id (FK `hr_employee_documents`), catalog_id, requires_grant boolean (docs sem grant prévio).
- `hr_document_share_access_log` — id, package_id, document_id, accessed_by, action (`view`|`download`|`link_regenerated`), accessed_at, ip.

**Enum novo**: `hr_share_purpose` (shipyard_entry, port_authorization, vessel_boarding, travel_booking, lodging_booking, other).

## Segurança e RLS

- `hr_coordinator_document_grants`: RH/Diretor/Super Admin CRUD; coordenador SELECT (para saber o que pode pedir); técnico/colaborador SELECT dos próprios (transparência).
- `hr_employee_documents` SELECT estendido: coordenador pode ler doc **X** de colaborador **E** se:
  a) existe grant ativo `(E, X.catalog_id)`, **ou**
  b) doc está em pacote `active` do coordenador que inclui esse doc especificamente.
- `hr_document_share_packages` e filhas: coordenador vê os próprios; RH/Diretor/Super Admin vê todos da empresa; colaborador vê pacotes que envolvem ele.
- Bucket `hr-documents`: policy espelha a mesma lógica por path do arquivo (função helper `public.can_coordinator_read_hr_doc(auth.uid(), doc_id)`).
- Todo `view`/`download` do coordenador grava log via wrapper no frontend + trigger de auditoria.
- Job `pg_cron` diário marca pacotes vencidos como `expired`.
- Notificações: colaborador é notificado quando seus documentos são incluídos em pacote (transparência); RH quando pacote entra `pending_review`; coordenador ao aprovar/rejeitar/revogar.
- Links de download sempre via `createSignedUrl` com TTL curto (10 min) gerado sob demanda — nunca URL pública.

## UI

**RH — nova aba em `/hr/documents` "Compartilhamento com Coordenadores"**
- Sub-aba 1 "Tipos compartilháveis": tabela do catálogo com toggle `coordinator_shareable`.
- Sub-aba 2 "Autorizações por colaborador": lista de colaboradores da empresa (todos os setores, com filtro por setor/cargo) → drawer com checklist dos tipos `coordinator_shareable` e switch "Liberar todos"; salva grants em massa. Mostra data e responsável pela liberação.
- Sub-aba 3 "Pacotes pendentes": fila de pacotes com docs sem grant prévio para aprovar/rejeitar (opção de "aprovar e persistir grant").
- Sub-aba 4 "Histórico de acessos": log filtrando por coordenador, colaborador, período.

**Coordenador — nova rota `/admin/employee-documents`**
- Diretório de **todos os colaboradores** da empresa cujos grants existem, agrupados por setor/cargo (filtros: setor, cargo, nome).
- Cada colaborador mostra os documentos autorizados (catálogo × grants) com vigência e badge de expiração.
- Botão "Criar pacote de envio" abre wizard: colaborador(es) → finalidade → destinatário → docs (permitidos + opção "Solicitar outros" que dispara `pending_review`) → expiração → justificativa.
- Aba "Meus pacotes" com status, dias até expirar, botão de regerar link assinado (loga).

**Colaborador — em `/corp/my-documents`**
- Seção "Autorizações vigentes": tipos que o RH liberou aos coordenadores.
- Seção "Compartilhamentos ativos": pacotes que envolvem docs seus, destinatário e validade.

## Marina (assistente)

Coordenador:
- `list_shareable_employees({ department?, position? })`
- `list_employee_shareable_docs({ employee_id })`
- `create_document_share_package({...})`
- `list_my_document_packages`

RH:
- `set_catalog_coordinator_shareable`, `grant_coordinator_document_access`, `revoke_coordinator_document_access`, `approve_document_package`, `reject_document_package`, `revoke_document_package`.

## Fora de escopo

- Marca d'água PDF por destinatário/data (segunda onda).
- Assinatura eletrônica de responsabilidade do coordenador (segunda onda).
- Envio automático por e-mail ao destinatário (hoje o coordenador copia o link).

## Detalhes técnicos

- Enum `hr_share_purpose` conforme acima.
- Índices: `hr_coordinator_document_grants(employee_id) where revoked_at is null`, `(catalog_id) where revoked_at is null`; `hr_document_share_packages(requested_by, status)`, `(status, expires_at) where status='active'`; `hr_document_share_items(document_id)`.
- Função `public.can_coordinator_read_hr_doc(uid uuid, doc_id uuid) returns bool` `SECURITY DEFINER`, usada nas policies do bucket e reutilizada na policy de `hr_employee_documents` para evitar recursão (segue o padrão `has_role`).
- Ordem das migrations: enum → alter `hr_document_catalog` → função helper → criar tabelas com GRANT+RLS+policies → estender policy SELECT de `hr_employee_documents` → policies do bucket → `pg_cron` de expiração → seed idempotente marcando tipos "óbvios" (RG, CPF, CNH, Passaporte, ASO) como `coordinator_shareable=true` (RH pode reverter).
- Trigger de auditoria em `hr_document_share_packages` (status change) e `hr_coordinator_document_grants` (create/revoke).
