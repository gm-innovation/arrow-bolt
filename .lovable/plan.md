## Objetivo
Executar uma bateria completa de testes E2E na área do Coordenador (`/admin/*`) via Playwright autenticado, validando as rotas críticas após as últimas mudanças (unificação Leads/Oportunidades, KPIs, papéis manager=coordinator, timezone, medições, etc.).

## Escopo de Testes

### 1. Autenticação e Roteamento
- Login como coordenador → redirect para `/admin/dashboard`
- Verificar que `/manager/*` bloqueia coordenador (só diretor/super_admin)
- Sidebar exibindo itens corretos (sem "Leads" duplicado, "Leads & Oportunidades" unificado)

### 2. Dashboard (`/admin/dashboard`)
- 4 KPIs de Leads (Novos / Em contato / Convertidos 30d / Descartados 30d) clicáveis
- Ausência dos cards antigos "Últimos leads" e "Oportunidades em aberto"
- Cards de OS, financeiro, técnicos carregando sem erro

### 3. Leads & Oportunidades unificados (`/admin/opportunities`)
- Kanban completo com colunas atualizadas (Identificada/Qualificada/Proposta/Negociação/Ganha/Perdida)
- Aba "Leads do Site" abrindo `LeadDetailsDialog`
- Conversão de lead criando `crm_buyers` + oportunidade
- Filtros via query param `?tab=leads` e `?status=...`

### 4. Ordens de Serviço (`/admin/orders`)
- Listagem, criação, edição
- Modal de Medição Final completo (`MeasurementDialog`)
- Restrição de edição por propriedade (só criador ou admin/diretor)
- Datas exibidas sem shift de fuso

### 5. CRM Clientes (`/admin/clients`)
- Modal unificado `NewClientForm` (múltiplos CNPJs/endereços, lookup CNPJ)
- Ausência de funcionários na lista de clientes
- Busca server-side via `crm_client_options`

### 6. Financeiro, Qualidade, Suprimentos, RH (acessos do coordenador)
- Rotas carregam sem crash
- Permissões RLS respeitadas

### 7. Notificações e Feed
- Sino de notificações carregando `lead_received` e demais
- Feed corporativo operacional

## Método
- Playwright headless com sessão Supabase injetada
- Screenshots por passo em `/tmp/browser/coord-tests/screenshots/`
- Captura de console errors e network 4xx/5xx
- Relatório final consolidado com: ✅ passou / ⚠️ atenção / ❌ falha + evidência

## Entregável
Relatório resumido no chat com lista de rotas testadas, screenshots-chave, bugs encontrados e recomendações de correção priorizadas. Correções propostas em plano separado se necessário.
