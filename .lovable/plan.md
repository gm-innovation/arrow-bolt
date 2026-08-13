# Sem gestor direto: o RH decide

Hoje, ao criar uma solicitação de férias, o sistema sempre grava o status "Aguardando Gestor" — mesmo quando o colaborador não tem gestor direto cadastrado. O diálogo de nova solicitação até avisa "irá direto para o RH", mas isso não acontece na prática. Resultado verificado no banco: a solicitação do HUGO ALEXANDRE SANTOS SILVA (sem gestor direto) está travada em "Aguardando Gestor" e a única ação disponível é Cancelar, porque não existe gestor para decidir.

## O que muda

1. **RH cadastrando = já aprovada**: quando quem cria a solicitação é o próprio RH (ou Diretoria/Super Admin), ela nasce com status "Aprovada", com a homologação registrada em nome de quem cadastrou. Nada de esperar aprovação de si mesmo.

2. **Sem gestor direto = RH decide**: quando um colaborador (não-RH) cria a solicitação e não tem gestor direto cadastrado, ela nasce em "Aguardando RH" — etapa única. Com gestor direto, o fluxo em duas etapas (Gestor → RH) continua igual.

3. **Aviso no diálogo**: o texto passa a refletir o comportamento real ("Cadastro pelo RH — a solicitação já será aprovada" / "Sem gestor direto — o RH decide diretamente").

4. **Destravar solicitações antigas**: a solicitação do Hugo (e qualquer outra em "Aguardando Gestor" sem gestor direto) passa a aparecer para o RH com o botão de decisão, sem precisar de intervenção manual.

5. **Registro da decisão**: o histórico de aprovações recebe uma única entrada de RH, sem etapa de gestor fictícia. O saldo do período aquisitivo é recalculado normalmente ao aprovar, como já ocorre hoje.


## Detalhes técnicos

- `useCreateVacationRequest` (`src/hooks/useVacations.ts`): definir `status` como `pending_hr` quando `manager_id` for nulo, `pending_manager` caso contrário.
- `src/pages/hr/Vacations.tsx`:
  - `renderActions`: além de `pending_hr`, permitir ao RH decidir solicitações em `pending_manager` com `manager_id === null` (botão "Homologar", `stage: "hr"`).
  - Ajustar o texto de aviso no `NewRequestDialog`.
- Sem mudança de schema, enum ou RLS — os status `pending_hr`/`approved` já existem e as políticas de RH já cobrem a atualização.
