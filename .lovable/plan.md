## Objetivo
Revalidar ponta-a-ponta o módulo Comercial/Marketing após todas as refatorações recentes (unificação de clientes, CNPJ automático, leads no Kanban, modal unificado, timezone) para garantir que nada quebrou.

## Escopo da revisão

### 1. Cadastro de Clientes (`/commercial/clients`)
- Abrir o novo modal unificado (`NewClientForm`) — verificar tabs Empresa / Contatos / Embarcações.
- Criar cliente PJ via busca por CNPJ (edge function `lookup-cnpj`).
- Criar cliente manualmente sem CNPJ.
- Editar cliente existente, adicionar razão social e endereço.
- Confirmar que o cliente aparece imediatamente na lista após salvar (invalidação de cache).
- Toggle `crm_visible` refletindo nos seletores do CRM.

### 2. Oportunidades e Leads (`/commercial/opportunities`)
- Kanban: coluna virtual "Leads do Site" carrega, mini-cards clicáveis abrem `LeadDetailsDialog`.
- Drag-and-drop de lead para coluna de estágio dispara `ConvertLeadDialog`.
- Botão "Converter" no card também abre o diálogo.
- Aba "Leads do Site": tabela clicável, filtro por status, badge de contagem.
- Conversão de lead → cria cliente + oportunidade + contato (`crm_buyers`).
- CRUD de oportunidade padrão (criar, editar, mover entre estágios).

### 3. Dashboard Comercial (`/commercial`)
- 4 mini-cards de KPI de leads (Novos, Em contato, Convertidos, Descartados) com contagens corretas.
- Cards de KPI comerciais existentes (pipeline, ganhos, previsão) continuam funcionando.

### 4. Combobox de clientes no CRM
- `ClientSearchCombobox` filtra apenas clientes com `crm_visible = true` (sem funcionários).
- Busca server-side por nome/CNPJ.

### 5. Datas e Timezone
- Datas exibidas em cards, tabelas e detalhes de lead/oportunidade sem shift de -1 dia.

### 6. Permissões
- Papel `marketing` acessa `/commercial/*` e recebe notificação `lead_received`.
- Papel `coordinator` em `/admin/clients` compartilha o mesmo formulário unificado.

## Método de teste
- Playwright headless contra `http://localhost:8080` autenticado com a sessão Supabase injetada.
- Screenshots em cada etapa em `/tmp/browser/commercial-review/screenshots/`.
- Verificação de console/network para erros silenciosos.
- Consultas SQL de sanidade (contagem de leads, oportunidades criadas nos testes) via `supabase--read_query`.
- Ao final, uma lista objetiva do que passou / falhou, com correção imediata dos problemas encontrados.

## Fora de escopo
- Alterações de UX que não sejam correção de bug.
- Módulos fora de Comercial/Marketing (RH, Qualidade, Financeiro).
- Geração de manual — só após validação completa.