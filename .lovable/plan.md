## Fase 2 — Refinamentos finais antes da Sprint 2.1

Todos os pontos anteriormente aprovados permanecem válidos. Estes são apenas refinamentos de modelagem.

---

### 1. `review_status` removido do schema

Campo é puramente derivado de `next_review_due_at` e da janela de alerta. Armazenar geraria inconsistência e exigiria job extra.

**Decisão:**
- **Não persistir** `review_status`.
- Calcular em runtime via SQL helper / view ou no frontend:

```text
overdue    : next_review_due_at <  today
due_soon   : next_review_due_at <= today + alert_window_days
up_to_date : caso contrário
```

- Criar view utilitária `quality_review_status_v` (entity_type, entity_id, next_review_due_at, computed_status) para consumo unificado pelo dashboard.

---

### 2. `next_review_due_at`: derivado, com trigger garantindo consistência

Mantemos o campo persistido (opção B) por performance no dashboard e em listagens, mas **sempre recalculado por trigger** — nunca escrito manualmente pelo app.

**Regra:**
```text
next_review_due_at = last_reviewed_at::date + (review_frequency_months || ' months')::interval
```

**Trigger:** `BEFORE INSERT OR UPDATE OF last_reviewed_at, review_frequency_months` em cada uma das tabelas alvo, recalcula `next_review_due_at`. Se `review_frequency_months` ou `last_reviewed_at` forem `NULL`, `next_review_due_at` vira `NULL`.

Função única reutilizável: `public.quality_recalc_next_review()`.

---

### 3. Adicionar `last_review_notes` (auditoria)

Quando o Master "Marca como revisado", a UI pede uma observação opcional explicando o que mudou / o que foi validado.

**Campo adicional padrão:**

```text
last_review_notes text  -- preenchido junto com last_reviewed_at
```

Aplicado em `quality_org_context` e `quality_interested_parties` (não em análise crítica — ver item 4).

---

### 4. `quality_critical_reviews`: ciclo é "quando ocorrer", não "revisar"

Correção conceitual: cada registro é **uma reunião realizada**, não uma entidade que se revisa.

**Modelo separado, sem reaproveitar o pacote dos itens 1–3:**

```text
quality_critical_reviews
  meeting_date              date
  inputs                    jsonb
  outputs                   jsonb
  minutes_document_id       uuid
  signed_event_id           uuid
  status                    text  -- planned | held | signed | archived
  next_meeting_due_at       date  -- quando deve ocorrer a próxima
```

**Configuração da cadência:**
- `review_frequency_months` da Análise Crítica fica **em Settings** (configuração global), não por registro.
- Ao gravar uma reunião com `status='held'` ou `'signed'`, trigger calcula `next_meeting_due_at = meeting_date + frequência_configurada`.
- Dashboard consome esse `next_meeting_due_at` para alertar "próxima análise crítica vencendo".
- **Sem** `last_reviewed_at` / `last_review_notes` / `review_status` aqui — esses conceitos não se aplicam a reuniões.

---

### 5. Settings — texto explícito

Seção "Ciclos de revisão" passa a detalhar:

```text
- Frequência padrão por entidade
    - Contexto da Organização          (meses)
    - Partes Interessadas              (meses)
    - Análise Crítica pela Direção     (meses, padrão 12)
- Janela de alerta antes do vencimento (dias, padrão 30)
```

Janela única compartilhada por todas as entidades de revisão e pela expiração de documentos do GED.

---

### Resumo das alterações sobre o plano anterior

| Item | Antes | Depois |
|---|---|---|
| `review_status` | coluna persistida | removido — calculado em runtime / view |
| `next_review_due_at` | escrito pelo app | persistido mas recalculado por trigger único |
| `last_review_notes` | inexistente | adicionado em contexto e partes interessadas |
| `quality_critical_reviews` | mesmo pacote das outras | modelo próprio: `next_meeting_due_at`, sem `last_reviewed_at`/`review_notes`/`review_status` |
| Settings | "ciclos de revisão" genérico | frequência por entidade + janela de alerta explícitas |

Todo o restante (escopo via GED tipo `ESCOPO_SGQ`, Partes Interessadas + evidências, documentos externos com `origin` ampliado, tópicos obrigatórios configuráveis da ata, Saúde e Segurança via `origin='safety'`, Melhorias com origem automática + manual, Conscientização, alertas dashboard + notificação interna obrigatórios) permanece **inalterado e aprovado**.

---

### Próximo passo

Aprovar libera o **detalhamento técnico da Sprint 2.1** (Escopo via GED, Normas, Termos, Contexto da Organização com revisão periódica): schema SQL completo com triggers, RLS, telas, hooks e componentes para nova aprovação antes da implementação.