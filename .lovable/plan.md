
# Simplificação do Compartilhamento de Documentos com Coordenadores

Hoje o RH precisa ativar o toggle "Compartilhar" documento por documento. Vamos oferecer 3 caminhos combinados para eliminar o trabalho manual.

## 1. Automático por padrão

Todo documento cujo tipo tem `coordinator_shareable = true` no catálogo (ASO, NRs, RG, CPF, CNH) passa a ser visível para os coordenadores **sem precisar do toggle**.

- A visibilidade do coordenador deixa de depender da tabela `hr_coordinator_document_grants` e passa a olhar direto o flag do catálogo.
- O RH configura uma vez em **Tipos & Compartilhamento** quais categorias são "auto-liberadas" — o padrão inicial já vem correto (documentação sensível de viagem/estaleiro liberada; contratos, PIS, escolaridade não).
- **Bloqueio individual (exceções)**: mantemos a tabela de grants apenas como *lista de exclusão* — se o RH quiser esconder um documento específico de um funcionário, ele desmarca. A UI da ficha vira: toggle ligado por padrão, RH desliga só em casos especiais.

## 2. Botão "Compartilhar tudo" na ficha

Na aba **Docs** do colaborador, ao lado de "Enviar Documento":

- Botão único **"Liberar todos para Coordenadores"** — remove todas as exceções daquele funcionário de uma vez.
- Botão inverso **"Bloquear todos"** — cria exceção para todos os tipos compartilháveis do funcionário.
- Contador visível: "5 de 5 tipos liberados".

## 3. Comandos para a Marina

A Marina ganha 3 ferramentas novas:

- `share_employee_documents({ employee_name, action: "release_all" | "block_all" })` — libera/bloqueia todos os documentos de 1 funcionário.
- `share_bulk_by_role({ role: "technician", action: "release_all" })` — "libere documentos de todos os técnicos para coordenadores".
- `share_bulk_by_type({ catalog_code: "aso" | "nr35" | ..., value: true | false })` — "ative ASO como compartilhável para toda a equipe".

Cada ação registra auditoria em `ai_assistant_actions` e devolve um resumo ("Liberados 32 documentos de 12 técnicos").

## Detalhes técnicos

- **Backend**:
  - Nova RPC `hr_coordinator_visible_docs` que retorna documentos vigentes onde `catalog.coordinator_shareable = true` **AND** não exista grant com `revoked_at = null` marcado como `is_block = true`.
  - Migração: adicionar coluna `is_block boolean default false` em `hr_coordinator_document_grants` para diferenciar "liberação explícita" (legado) de "bloqueio explícito" (novo modelo). Backfill: todos os grants ativos hoje viram `is_block=false` (já significam liberação); o hook novo passa a inserir `is_block=true` para exceções.
  - Atualizar `useCoordinatorEmployeeDocs` para usar a nova regra.
- **Frontend**:
  - `DocumentsTab` na ficha: toggle invertido (padrão ligado se `catalog.coordinator_shareable`, desliga = cria bloqueio).
  - Botões "Liberar todos" / "Bloquear todos" no header da aba.
  - `/hr/document-sharing`: página passa a mostrar apenas o catálogo (quais categorias são compartilháveis) — a lista pormenor de exceções vira uma aba secundária.
- **Marina** (`supabase/functions/ai-assistant/index.ts`):
  - Registrar as 3 novas tools em `AI_TOOLS`.
  - Cada handler valida papel do usuário (só `hr`, `director`, `super_admin` podem executar).

## Fora de escopo

- Fluxo de aprovação/pacote (`hr_document_share_packages`) permanece como está — continua sendo usado para envios externos a estaleiros/hotéis.
- Página `/admin/employee-documents` (visão do coordenador) só precisa refletir a nova regra via hook atualizado — sem mudança de UI.
