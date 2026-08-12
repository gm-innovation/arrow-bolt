# Marco inicial de admissão no Histórico do colaborador

Hoje a seção "Movimentações" só ganha registros quando setor, função ou gestor mudam. Para quem nunca sofreu alteração, a aba fica vazia — mesmo tendo cadastro completo. A ideia é criar a **primeira linha da linha do tempo** representando a admissão.

## O que muda

- Cada colaborador passa a ter um registro inicial de movimentação com:
  - data de início = data de admissão (ou, se ausente, a data de criação do cadastro);
  - setor, função e gestor atuais como valores "novos" (sem valor anterior);
  - motivo: "Admissão".
- Esse registro fica aberto (`→ atual`) até a primeira mudança real, que então o fecha normalmente pelo fluxo já existente.
- Para novos colaboradores, o marco é criado automaticamente no momento do cadastro.
- Para os colaboradores já cadastrados, é feita uma carga única retroativa — sem duplicar quem já tenha histórico.

## Como fica na tela

```text
Histórico > Movimentações

01/03/2024 → atual                       [Admissão]
Setor: — → Operações
Função: — → Técnico de Campo
Gestor: — → João Silva
```

Nenhuma mudança visual na aba: o componente atual já renderiza motivo, período e antes/depois.

## Detalhes técnicos

1. Migração no banco:
   - Função `hr_seed_initial_assignment()` + trigger `AFTER INSERT ON public.profiles`, que insere em `hr_employee_assignments` os valores atuais de `department_id`, `position_id`, `position`, `direct_manager_id`, com `valid_from = COALESCE(hire_date, created_at::date)` e `change_reason = 'Admissão'`.
   - Backfill idempotente: `INSERT ... SELECT` para todo `profiles` que ainda não tenha nenhuma linha em `hr_employee_assignments`.
   - Trigger existente `hr_profiles_track_assignments` permanece inalterado; ele fecha a linha inicial na primeira alteração.
2. Nenhuma alteração de frontend necessária — `AssignmentHistoryTab` já trata `previous_*` nulos como "—".
