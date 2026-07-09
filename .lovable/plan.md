
# Auditoria de "mistura de entidades" no CRM

Escopo: `clients`, `crm_buyers`, `client_contacts`, `crm_opportunities`, `crm_tasks`, `crm_sales`, `crm_client_recurrences`, `public_site_leads`, `profiles`, `user_roles`. Só relatório — nenhuma correção aplicada.

## TL;DR

O código dos selectors do CRM **está correto**: cada dropdown consulta a tabela certa (`clients` filtrado por `company_id`, `crm_buyers` filtrado por `client_id`, `profiles` filtrado por `user_roles` para "Responsável"). O que você viu no print **não é bug de UI — é poluição de dados na tabela `clients`**, provavelmente vinda de import Omie / cadastro manual.

## Achados críticos (dados)

### 1. Colaboradores cadastrados como "Cliente" — 24 registros
Consulta: nomes em `clients.name` idênticos a `profiles.full_name` da mesma empresa.

Exemplos confirmados: `CAHUA ARAUJO FERNANDES`, `CAIO REIS MARTINS DE VERAS` — os que apareceram no seu dropdown. São linhas reais na tabela `clients`, por isso aparecem legitimamente no selector de Cliente. Impacto: qualquer opp/tarefa/venda pode ser criada "para" um colega em vez do cliente real, distorcendo receita/pipeline.

### 2. Clientes duplicados em massa — do Omie
```text
SULNORTE SERVICOS MARITIMOS LTDA         10x
SAAM TOWAGE BRASIL S.A.                  10x
GURGELMIX MAQUINAS E FERRAMENTAS          7x
MAGAZINE LUIZA / KALUNGA / BRASPRESS      6x cada
CAMORIM SERVICOS MARITIMOS LTDA           3x (com e-mails diferentes)
```
20+ grupos com 3-10 duplicatas. Cada duplicata compete no selector, fragmenta histórico, opps, contatos e recorrências.

### 3. 1200 clientes sem marcador PJ (Ltda/SA/EIRELI/ME…)
Nem todos são bugs — pode ter PF legítimo — mas é o universo onde estão escondidos os "funcionários virados clientes".

### 4. Integridade referencial: OK
```text
crm_buyers órfãos / cross-company          → 0
crm_opportunities.client_id órfão          → 0
crm_opportunities.buyer_id órfão           → 0
crm_opportunities.buyer_id ≠ client_id     → 0
crm_opportunities.assigned_to → clients    → 0 (nunca aponta pra cliente)
```
Ou seja: ninguém salvou um `client_id` no campo `assigned_to`, nem vice-versa. A "mistura" é só visual, causada pelos registros errados no #1.

## Achados de código (revisão dos selectors)

Verificado, um a um, os hooks/queries que alimentam dropdowns do CRM:

| Selector | Fonte | Filtro | Status |
|---|---|---|---|
| Cliente (Nova Opp, Editar Opp, Nova Tarefa, Nova Recorrência, Reservas) | `clients` | `company_id` | OK |
| Comprador (Opp) | `crm_buyers` via `useBuyers` | `company_id` + `client_id` selecionado | OK |
| Contato (dossier) | `client_contacts` | `client_id` | OK |
| Responsável (Opp, Tasks) | `useCompanyUsers(['commercial','admin','director','manager'])` → `profiles ∩ user_roles` | `company_id` + roles | OK — mas ver §"Riscos residuais" |
| Usuários (admin) | `useAllUsers` → `profiles` | sem filtro de empresa | OK para super admin, ver §"Riscos residuais" |

Nenhum selector do CRM consulta `profiles` para popular Cliente ou consulta `clients` para popular Responsável.

## Riscos residuais no código

R1. `useCompanyUsers` ainda **não inclui `marketing`** na lista de roles quando o consumidor pede "comercial". Marketing não aparece como Responsável de opps/tarefas do Comercial. Impacto direto no go-live do Marketing.

R2. `useCompanyUsers` filtra `user_roles` por role mas **não filtra por `company_id`** — como user_roles não tem company_id, hoje a interseção com `profiles.company_id` protege. Se um mesmo `user_id` pertencer a duas empresas (multi-tenant), pode vazar. Baixo risco atual, mas frágil.

R3. `useAllUsers` (usado em Super Admin/HR) faz join implícito de `profiles + companies` sem filtrar empresa — correto para super admin, **mas o painel de admin do Comercial (`/commercial/admin/Users.tsx`) usa o mesmo hook**. Se o coordenador comercial não for super admin, ele pode listar usuários de outras empresas caso a RLS deixe passar. Precisa validar.

R4. O CRM não distingue **Pessoa Física × Pessoa Jurídica** em `clients`. Sem esse flag, `useClients` não tem como excluir automaticamente registros criados "como se fossem" um funcionário. Enquanto isso não existir, sempre haverá risco de reincidência.

R5. `crm_buyers` (contato comercial na PJ) e `client_contacts` (contato genérico do cliente) são **duas tabelas diferentes** para o mesmo conceito. Já há memory sobre "dual-insert" para o contato primário, mas os dossiês, opps e tasks consultam fontes diferentes, o que pode levar a informação divergente. Não é bug de vazamento, é dívida de modelagem.

## Priorização recomendada (para você decidir depois)

P0 — Bloqueia go-live comercial/marketing:
- Limpar os 24 "colaboradores-cliente" (mover pra `crm_buyers` do cliente correto ou deletar).
- Deduplicar clientes Omie (SULNORTE, SAAM, KALUNGA…): merge por CNPJ, preservando opps/contatos filhos.
- Incluir `marketing` em `useCompanyUsers` sempre que hoje passa `commercial`.

P1 — Prevenção de reincidência:
- Adicionar `clients.entity_type` (`pj` | `pf`) e default `pj`.
- Trigger que bloqueia insert em `clients` quando `name` bate com `profiles.full_name` da mesma empresa (com override para PF legítima).
- Ajustar import Omie para deduplicar por CNPJ antes de inserir.

P2 — Higiene de médio prazo:
- Auditar/filtrar `useAllUsers` por company_id quando o consumidor não é Super Admin.
- Decidir consolidação `crm_buyers` × `client_contacts` (uma tabela só, com flag `is_commercial_buyer`).

## Como validar rapidamente cada achado

```sql
-- 1. Colaboradores como cliente
SELECT c.id, c.name FROM clients c
JOIN profiles p ON p.company_id=c.company_id AND upper(trim(p.full_name))=upper(trim(c.name));

-- 2. Duplicatas por nome
SELECT upper(trim(name)), count(*) FROM clients GROUP BY 1 HAVING count(*)>1 ORDER BY 2 DESC;

-- 3. Marketing ausente no selector de Responsável
SELECT id, role FROM user_roles WHERE role='marketing';  -- devem existir mas não caem em useCompanyUsers(['commercial',...])
```

Quando quiser, digo qual das P0/P1/P2 executo e em qual ordem.
