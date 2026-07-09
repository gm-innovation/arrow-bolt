## Corrigir shift de fuso em datas puras (varredura global)

**Bug:** Colunas `date` (sem hora) sofrem shift de -1 dia porque `new Date('YYYY-MM-DD')` é parseado como UTC 00:00 e formatado em `America/Sao_Paulo` (UTC-3). Ex.: 18/05/1983 → 17/05/1983; 01/01/2024 → 31/12/2023. Já existe regra em memória (Core) para isso.

### Estratégia

1. **Helper único** em `src/lib/utils.ts`:
   - `parseLocalDate(iso: string | null | undefined): Date | null` → split `YYYY-MM-DD` e `new Date(y, m-1, d)`.
   - `formatLocalDate(iso, pattern = 'dd/MM/yyyy')` que usa `parseLocalDate` + `date-fns/format`.
   - Reexportar para uso amplo.

2. **Varredura** em `src/**` por padrões de risco em campos `date` puros:
   - `new Date(<var>).toLocaleDateString`
   - `format(new Date(<var>), ...)` onde `<var>` vem de coluna `date`
   - `new Date(<var>).toISOString().split('T')[0]` em salvamentos (usar valor do `<input type="date">` cru)
   - `parseISO(<var>)` sobre colunas `date` (parseISO trata como local, mas formatações subsequentes podem ainda estar OK — validar caso a caso)

3. **Campos-alvo prioritários** (colunas `date` no schema):
   - `profiles.birth_date`, `profiles.hire_date`
   - `hr_health_exams.exam_date`, `next_exam_date`, `aso_issue_date`, `aso_valid_until`
   - `hr_vacation_periods.period_start/end`, `hr_vacation_requests.start_date/end_date/return_date`
   - `hr_partnerships.start_date/end_date`
   - `hr_employee_documents.issued_at/expires_at`
   - `technician_absences.start_date/end_date`
   - `home_office_schedules.date`
   - `company_holidays.date`
   - `epi_deliveries.delivery_date/return_date`
   - `quality_*` com `*_date`, `next_review_date`, `published_at` quando for `date`
   - `finance_*.due_date`, `payment_date`, `issue_date`
   - `crm_*` com colunas `date` (renovações, tarefas com date-only)
   - `service_orders`/`service_visits` para campos date-only (não confundir com `timestamptz`)

4. **Correção por arquivo:** substituir formatações e parses das colunas acima por `formatLocalDate(...)` / `parseLocalDate(...)`. Ao salvar, enviar direto o `value` do `<input type="date">` sem `.toISOString()`.

5. **Não alterar** campos `timestamptz` (têm hora real) — para esses o comportamento atual está correto.

Sem migração de banco. Só código do frontend.

### Entrega
- Helper em `src/lib/utils.ts`.
- Correções nos arquivos identificados pela varredura (rg) — incluindo o `EmployeeDetailSheet.tsx` que motivou o report.
- Sem mudanças de schema, sem mudanças em edge functions.
