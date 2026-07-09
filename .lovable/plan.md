# Plano — Refatoração Comercial/Marketing + Manual v3

Ordem: primeiro corrigimos o produto (Ondas 1–4), depois regeramos o manual v3 já refletindo o sistema correto (Onda 5). Cada onda vira uma entrega separada para você validar antes da próxima.

---

## Onda 1 — Base global de Clientes, Compradores e Embarcações (item 6)

**Objetivo:** eliminar a percepção de "cadastros por departamento". Cliente é da empresa; Coordenação, Comercial, Marketing e Suprimentos consomem a mesma base.

- Consolidar `clients` + `crm_client_options` + formulário dos Coordenadores em **um único cadastro global** por `company_id`.
- Padronizar a distinção entre "cliente ativo" e "prospect" via campo `commercial_status` (item 3): quando existe OS/venda, exibir badge **Cliente**; sem histórico comercial, **Prospect**. Nada de duplicar registros.
- Reaproveitar `client_contacts` / `crm_buyers` como visões da mesma pessoa (contato operacional = comprador). Unificar via `ClientSearchCombobox` já existente, agora usado também nos formulários de Coordenação.
- Embarcações (`vessels`) e vínculos comprador↔embarcação (`contact_vessel_links`) permanecem globais e passam a aparecer em todos os módulos que hoje mostram só um recorte.
- Remover formulários duplicados; manter um único **"Adicionar Cliente"** disponível em Comercial, Coordenação e Suprimentos com as mesmas regras.

## Onda 2 — Cadastro de Cliente por CNPJ com preenchimento automático (item 4)

**Objetivo:** ao abrir "Adicionar Novo Cliente", começar pelo CNPJ e buscar os dados públicos.

- Novo Edge Function `lookup-cnpj` que consulta uma API pública de CNPJ (BrasilAPI/ReceitaWS) e retorna razão social, nome fantasia, endereço, CNAE, telefone e e-mail quando disponíveis.
- Campo CNPJ vira o primeiro passo do modal: máscara, validação de dígito, botão **Buscar**. Ao retornar, preencher os demais campos, mantendo edição manual.
- Fallback manual quando a API não responde ou o CNPJ é estrangeiro.
- Reaproveitado em Coordenação, Comercial e Suprimentos (base já unificada na Onda 1).

## Onda 3 — Destaque de Leads no Dashboard Comercial (item 7)

**Objetivo:** leads recebidos pelo site ficam visíveis logo na entrada do módulo.

- Novo card **"Leads recentes (últimos 7 dias)"** no `/commercial/dashboard`, com contador, lista das 5 últimas entradas e ação **Abrir**.
- Notificação in-app (usa `notifications` já existente) para papéis `commercial`, `marketing` e `director` sempre que um novo lead chega em `public_site_leads`.
- Badge com contagem de leads não lidos no item **Leads do Site** do menu lateral.

## Onda 4 — Medições puxando saídas de material do Eva (item 8)

**Objetivo:** medição deixa de ser cadastro manual e passa a consolidar o que já foi apontado.

Fluxo alvo:

```text
Eva (saídas de material por OS) ──▶ os_materials ──▶ Medição (rascunho)
                                                       │
                                Time entries (mão de obra) ─┤
                                                       │
                              Deslocamentos/Despesas manuais ─┘
                                                       ▼
                                        Comercial/Coordenação revisa,
                                        aplica ISS por categoria,
                                        finaliza e envia ao cliente
```

- Ao abrir Medição de uma OS, popular automaticamente a aba **Materiais** a partir de `os_materials` (integração Eva já existente) — sem exigir OS finalizada.
- Sincronizador (`Sincronizar`) passa a listar OS **com saídas de material ainda não medidas**, não OS finalizadas.
- Preservar edição manual (adicionar/remover linhas), mas marcar origem "Eva" nas linhas importadas para auditoria.
- Mão de obra continua vindo de `time_entries`; deslocamento/despesas seguem manuais.
- Ajustar textos e tooltips para deixar claro o novo fluxo.

## Onda 5 — Manual de Uso Comercial/Marketing v3

Só depois das Ondas 1–4 aprovadas. Regera o PDF cobrindo todas as suas observações:

- **Remover** referência a "Instalar App" (item 1) — só menciona favoritos/PWA se realmente existir; caso contrário, corta.
- **Corrigir** origem das credenciais: **"e-mail e senha fornecidos pela Engenharia"** (item 2).
- **Explicar** o ciclo Prospect → Cliente conforme definido na Onda 1 (item 3).
- **Reescrever** capítulo de Clientes descrevendo o novo cadastro por CNPJ (item 4) e a base global compartilhada (item 6).
- **Refazer o print** do modal de Oportunidade aberto (item 5) e detalhar cada aba (Detalhes, Histórico, Tarefas, Itens, Transferência).
- **Adicionar destaque de Leads** no capítulo de Dashboard (item 7).
- **Reescrever** o capítulo de Medições conforme o novo fluxo Eva → Medição → Cliente (item 8).
- **Novo capítulo "Minha Conta"** cobrindo as abas Conta, Segurança, Assinatura, Aparência, Notificações, Sessão e Conscientizações, incluindo troca de senha (item 9).
- **Novos capítulos**: Admin (do módulo Comercial), Feed corporativo, Solicitações, Treinamentos (Universidade Corporativa) e assistente **Marina** (IA) — todos com passo a passo e prints (item 10).
- Manter identidade visual, callouts e sumário do padrão SGQ v6.

---

## Detalhes técnicos (para referência)

- **Onda 1:** consolidar em `public.clients` (fonte única). Ajustar RLS para leitura por qualquer papel operacional da mesma `company_id`; escrita restrita a Coordenação/Comercial/Suprimentos/Director. Migrar formulários de Coordenação para reusar `NewClientForm`. Depreciar caminhos que criam cliente fora dessa base.
- **Onda 2:** `supabase/functions/lookup-cnpj/index.ts` com cache curto (idempotency por CNPJ + timestamp) para não estourar limite da API pública. Sem segredo obrigatório (BrasilAPI é aberta); se optarmos por ReceitaWS pago, peço a chave via `add_secret`.
- **Onda 3:** trigger `AFTER INSERT` em `public_site_leads` insere `notifications` para os papéis alvo. Card do dashboard consome `useCommercialStats` estendido.
- **Onda 4:** ajustar `useMeasurements` e `MaterialsTab` para hidratar a partir de `os_materials` filtrando `service_order_id`; nova coluna `origin` (`eva` | `manual`) em `measurement_materials`.
- **Onda 5:** reusar scripts Playwright em `/tmp/browser/manual/` para novas capturas; PDF via ReportLab seguindo o layout do SGQ v6.

## Fora do escopo agora

- Reescrever módulos de Coordenação além do formulário de cliente.
- Alterar integração Omie/Eva além do que a Onda 4 precisa.
- Redesenho visual global do Comercial.
