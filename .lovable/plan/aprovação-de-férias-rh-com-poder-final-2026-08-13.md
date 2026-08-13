# Aprovação de férias: RH com poder final

Hoje, ao criar uma solicitação de férias, o sistema sempre grava o status "Aguardando Gestor" — mesmo quando o colaborador não tem gestor direto cadastrado. O diálogo de nova solicitação até avisa "irá direto para o RH", mas isso não acontece na prática. Resultado verificado no banco: a solicitação do HUGO ALEXANDRE SANTOS SILVA (sem gestor direto) está travada em "Aguardando Gestor" e a única ação disponível é Cancelar, porque não existe gestor para decidir.

## O que muda

1. **RH cadastrando = já aprovada**: quando quem cria a solicitação é o próprio RH (ou Diretoria/Super Admin), ela nasce com status "Aprovada", com a homologação registrada em nome de quem cadastrou.

2. **Sem gestor direto = RH decide**: quando um colaborador (não-RH) cria a solicitação e não tem gestor direto cadastrado, ela nasce em "Aguardando RH" — etapa única.

3. **RH pode aprovar direto mesmo com gestor direto**: em qualquer solicitação pendente (aguardando gestor ou aguardando RH), o RH tem o botão "Aprovar direto", que conclui a solicitação sem esperar o gestor. A etapa do gestor fica registrada como dispensada pelo RH, com autor e comentário.

4. **Aviso no diálogo**: o texto passa a refletir o comportamento real ("Cadastro pelo RH — a solicitação já será aprovada" / "Sem gestor direto — o RH decide diretamente").

5. **Destravar solicitações antigas**: a solicitação do Hugo (e qualquer outra travada em "Aguardando Gestor") passa a ter ação disponível para o RH, sem intervenção manual no banco.

6. **Registro da decisão**: o histórico de aprovações recebe uma entrada de RH; o saldo do período aquisitivo é recalculado normalmente ao aprovar, como já ocorre hoje.

## Detalhes técnicos

- `useCreateVacationRequest` (`src/hooks/useVacations.ts`): recebe o status inicial calculado — `approved` (com `hr_decision_by`/`hr_decision_at` e registro em `hr_vacation_approvals` na etapa de RH) quando o criador é RH/Diretoria/Super Admin; `pending_hr` quando não há `manager_id`; `pending_manager` nos demais casos.
- `useDecideVacationRequest`: aceitar `stage: "hr"` sobre solicitações em `pending_manager`, gravando a decisão final de RH (bypass do gestor) sem inventar decisão de gestor.
- `src/pages/hr/Vacations.tsx`:
  - `NewRequestDialog`: calcular o status pelo papel do usuário logado (`isHR`) e ajustar o texto de aviso.
  - `renderActions`: manter "Decidir" para o gestor responsável e adicionar, para o RH, "Aprovar direto"/"Homologar" em qualquer solicitação em `pending_manager` ou `pending_hr`.
- Sem mudança de schema, enum ou RLS — os status já existem, as políticas de RH cobrem a gravação e o gatilho de recálculo de saldo/conflitos já roda na inserção e atualização.


