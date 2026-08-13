# Férias: aviso de conflito com critério certo + atualização automática da tela

## Confirmado no banco

A programação do Hugo (03/01/2027 a 22/01/2027, 20 dias + 10 vendidos, aprovada) foi gravada sem empresa (`company_id` nulo) — por isso não aparecia. Já aparece porque a página foi recarregada, mas o dado continua nascendo sem empresa quando é a Marina que grava, e a tela só atualiza com recarga manual.

Dos 58 perfis, 34 têm setor (`department_id`) e cargo preenchidos.

## O que muda

### 1. Gravar certo e aparecer na hora

- A programação criada pela Marina passa a herdar a empresa do colaborador (fallback: empresa do usuário logado).
- As linhas antigas sem empresa são corrigidas.
- A tela de Férias passa a se atualizar sozinha: assinatura de mudanças na tabela de solicitações, revalidando programações, períodos e conflitos — sem recarregar a página, inclusive quando a gravação vem da Marina.

### 2. Dois tipos de conflito, com significados diferentes

**Conflito de caixa (independe de setor)**
Três ou mais colaboradores **iniciando** férias no mesmo mês. Como o pagamento das férias sai no mês do início, isso pesa no caixa. O aviso considera todo mundo, de qualquer setor.

**Conflito operacional (desfalque)**
Dias de férias sobrepostos entre colaboradores **do mesmo setor** — mesmo quando um começou no mês anterior e o outro começa no mês seguinte. Sobreposição entre setores diferentes não é conflito e não gera aviso.

O aviso sempre diz de qual tipo se trata, com nomes, datas e quantos dias coincidem (no caso operacional) ou quantos inícios já existem no mês (no caso de caixa).

### 3. Marina pergunta antes de gravar

Antes de criar, a Marina checa os dois critérios. Se houver conflito, ela **não grava**: informa quem conflita, o tipo de conflito e pergunta se agenda mesmo assim. Só grava depois do "pode" — e o conflito continua registrado para o RH ver na tela.

### 4. Mesma leitura na tela

A tela de Férias passa a separar os dois casos: contagem mensal de inícios (limite de colaboradores/mês) e sobreposição por setor. A lista de sobreposição mostra o setor de cada colega e destaca as do mesmo setor; as de setores diferentes ficam como informação neutra, sem alarme.

## Detalhes técnicos

- `supabase/functions/ai-assistant/tools.ts` (`request_vacation`):
  - `company_id` no payload (de `profiles.company_id` do colaborador, fallback `ctx.companyId`);
  - novo parâmetro `confirm_conflict: boolean`;
  - checagens antes do insert: (a) `count` de solicitações ativas com `start_date` no mesmo mês/ano ≥ limite da empresa em `hr_vacation_rules` (padrão 3); (b) solicitações ativas com sobreposição de datas cujo `profiles.department_id` seja igual ao do colaborador;
  - quando houver conflito e `confirm_conflict !== true`, retornar `requires_confirmation` com `tipo`, colegas, datas e dias de interseção, sem gravar.
- `supabase/functions/ai-assistant/index.ts`: regra no bloco FÉRIAS — apresentar os conflitos em texto corrido e só reexecutar com `confirm_conflict: true` após autorização explícita.
- `src/lib/hr/vacationOverlaps.ts`: incluir `department_id` no cálculo e marcar cada sobreposição como `sameDepartment`; nova função de contagem de inícios por mês.
- `src/hooks/useVacations.ts`: trazer `department_id` no join de `profiles`; subscrição realtime em `hr_vacation_requests` invalidando `vacation-requests`/`vacation-periods`/`vacation-conflicts`.
- `src/components/hr/vacations/OverlapList.tsx` e `VacationYearGrid`/`VacationMonthGrid`: separar sobreposição do mesmo setor (alerta) de outros setores (informativo) e usar a contagem de inícios no destaque mensal.
- Dado: preencher `company_id` nas solicitações órfãs a partir do perfil do colaborador.
- Sem mudança de schema ou RLS.
