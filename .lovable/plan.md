
# Sprint 3.2 — Saúde e Segurança via GED (final, aprovado)

Reaproveita toda a infra de GED (Fase 1/2) e entrega uma área dedicada de S&S com tipos de documento próprios, dashboard de vencimentos e integração ao sistema de alertas existente.

## Confirmações pré-build
- ✅ `quality_alerts_v` já popula `category='safety'` para documentos com `origin='safety'` (verificado: `SELECT d.origin::text AS category ...`). **Nenhuma alteração de view necessária.** Basta acrescentar o counter `safety` no hook `useQualityAlerts`.
- ✅ Sem novas tabelas.
- ✅ Seeding idempotente sob demanda via `quality_seed_safety_document_types`.
- ✅ Detalhe reutiliza `/quality/documents/:id`.
- ✅ Ficha de EPI e ASOs por colaborador fora do escopo.

## Banco de dados (1 migration)

1. `ALTER TABLE quality_document_types ADD CONSTRAINT IF NOT EXISTS uq_qdt_company_prefix UNIQUE (company_id, code_prefix);` (verificar existência antes).
2. Função `quality_seed_safety_document_types(p_company_id uuid) RETURNS void` — SECURITY DEFINER com `SET search_path = public`, faz `INSERT ... ON CONFLICT (company_id, code_prefix) DO NOTHING` para os 7 tipos:

| code_prefix | name                                              | default_review_interval_months |
|-------------|---------------------------------------------------|--------------------------------|
| PCMSO       | Programa de Controle Médico de Saúde Ocupacional  | 12                             |
| PGR         | Programa de Gerenciamento de Riscos               | 24                             |
| LTCAT       | Laudo Técnico das Condições Ambientais            | 12                             |
| NR01        | Documentação NR-01 (GRO)                          | 12                             |
| FICHA_EPI   | Ficha de Controle de EPI (modelo)                 | 12                             |
| ASO         | Atestado de Saúde Ocupacional (modelo)            | 12                             |
| LAUDO_SST   | Outros Laudos de S&S                              | 12                             |

3. `GRANT EXECUTE ON FUNCTION quality_seed_safety_document_types(uuid) TO authenticated;` — RLS efetiva fica no SECURITY DEFINER, que valida via `has_role` que o caller é coordinator/director/super_admin da `p_company_id` antes de inserir.

## Frontend

### Hook `src/hooks/useQualitySafetyDocuments.ts`
Wrapper sobre `useQualityDocuments` filtrando `origin='safety'`. Expõe:
- `documents`, `byType`, `expiringSoon`, `expired`
- `seedTypes()` chama `supabase.rpc('quality_seed_safety_document_types', { p_company_id })`
- `hasSafetyTypes` boolean (calculado de `quality_document_types` por `code_prefix` IN dos 7)

### Ajuste `src/hooks/useQualityAlerts.ts`
Acrescentar no objeto `counters`:
```ts
safety: countBy((a) => a.source === "document" && a.category === "safety"),
```

### Página `src/pages/quality/Safety.tsx` (rota `/quality/safety`)
- KPIs: Ativos, Vencendo em ≤30d, Vencidos, Sem prazo.
- Filtros: Tipo, Status (vigente/vencendo/vencido), Período.
- Tabela: Tipo (badge), Código, Título, Versão Vigente, Validade, Status, Ação (abrir `/quality/documents/:id`).
- Botão **"Novo documento de S&S"** abre dialog reusando criação de `quality_documents`, com `origin='safety'` fixo e Select restrito aos 7 tipos.
- Banner "Configurar tipos padrão de S&S" se `!hasSafetyTypes`.

### Navegação
- `App.tsx`: lazy `QualitySafety` + `<Route path="/quality/safety" element={<QualitySafety />} />`.
- `DashboardLayout.tsx`: item **"Saúde e Segurança"** (ícone `HardHat`) entre "Auditorias" e "Voz do Cliente".

### Dashboard da Qualidade
Card "S&S — documentos vencidos/vencendo" usando `counters.safety` no `Dashboard.tsx`.

## Permissões
Sem mudanças nas policies; coordinator/director/super_admin gerenciam, demais leem conforme `widely_visible` / permissões granulares já existentes em `quality_documents`.

## Entregáveis
1. Migration: `UNIQUE(company_id, code_prefix)` + `quality_seed_safety_document_types`.
2. `useQualitySafetyDocuments.ts`.
3. Ajuste em `useQualityAlerts.ts` (counter `safety`).
4. `Safety.tsx`.
5. Rota + item de menu.
6. Card no Dashboard da Qualidade.
