# Férias: modal enxuto + Marina com CRUD completo

## Parte A — Modal "Nova Solicitação de Férias"

### 1. Rolagem correta

Altura máxima de ~85% da tela: título fixo no topo, botões (Cancelar / Registrar) fixos no rodapé, e só o meio do formulário rola.

### 2. Colaborador: busca fechada por padrão

- A lista começa fechada; aparece só o campo de busca (ou o nome já selecionado com botão "Trocar").
- Abre ao clicar/focar no campo ou ao digitar; fecha ao escolher um nome.
- Altura limitada (~11rem) com rolagem própria.

### 3. Só férias, sem campos de outras áreas

- Sai o seletor "Tipo" (a tela é de férias).
- Sai "Solicitar adiantamento da 1ª parcela do 13º" — isso pertence à área de Solicitações.
- Sai a caixa "Dividir férias em parcelas" e o campo solto de abono.

### 4. Dias restantes: pergunta em vez de opção técnica

Quando o período escolhido é menor que o direito do colaborador (normalmente 30 dias), o modal calcula os dias restantes e pergunta o que fazer:

- **Programar depois** (padrão): ficam de saldo no período aquisitivo.
- **Vender os dias (abono)**: até o limite da empresa (hoje 10 dias); acima disso avisa e devolve o excedente para "programar depois".

Resumo em linguagem simples: "20 dias de gozo · 10 dias restantes: vender (abono)".
Mínimo de 5 dias por solicitação; data fim anterior ao início continua bloqueada. Se a política não permitir divisão, o pedido parcial ainda pode ser enviado — apenas com aviso em âmbar, e o motor de regras registra o conflito para o RH avaliar.

## Parte B — Marina com férias ponta a ponta

Hoje a Marina lista e cria/edita solicitações de férias, mas: só para o perfil de RH, sem enxergar saldo, sem aprovar/rejeitar e sem cancelar. Além disso a consulta pede uma coluna inexistente ("days"), o que faz a listagem falhar.

O que passa a existir:

- **Consulta corrigida e mais útil**: nome do colaborador, período, dias, abono, status e etapa pendente; filtro por colaborador, status e intervalo de datas.
- **Saldo de férias**: consultar períodos aquisitivos do colaborador (direito, usados, vendidos, saldo, prazo limite de gozo) e os conflitos detectados.
- **Solicitar férias em nome do colaborador**, com a mesma regra da tela: vínculo automático ao período mais antigo com saldo, roteamento para gestor ou direto para o RH quando não há gestor, e aprovação imediata quando quem pede é RH/Diretoria.
- **Aprovar / rejeitar** como gestor ou como RH (incluindo "aprovar direto" dispensando o gestor), gravando o histórico de aprovação com autor e comentário.
- **Cancelar** solicitação, com a confirmação em duas etapas já usada nas exclusões.
- **Acesso por perfil**: qualquer colaborador pode pedir as próprias férias e ver o próprio saldo pela Marina; gestores decidem as da sua equipe; RH e Diretoria têm o pacote completo. Quem não tem permissão recebe um aviso — nada de contornar o banco, que continua sendo a autoridade final.
- Toda escrita é resumida em uma frase e executada só depois do "pode".

## Detalhes técnicos

**Frontend** (`src/pages/hr/Vacations.tsx`, `NewRequestDialog`):
- `DialogContent` com `max-h-[85vh] flex flex-col overflow-hidden p-0`; cabeçalho e `DialogFooter` fora da área rolável; corpo em `flex-1 overflow-y-auto px-6 py-4`.
- Estado `listOpen` (abre em `onFocus`/digitação, fecha na seleção), lista `max-h-44 overflow-y-auto`.
- Remover `Select` de tipo (fixar `request_type: "vacation"`), checkbox de 13º (`advance_13th: false`), checkbox `isSplit` e input livre de abono.
- Novo estado `remainderChoice: "later" | "sell"`; `sell_days` derivado do restante, limitado por `rules.max_dias_abono`.
- Direito calculado do período auto-selecionado (`entitled_days - used_days - sold_days`, fallback 30).

**Marina** (`supabase/functions/ai-assistant/`):
- `tools.ts`: corrigir `query_hr_vacation_requests` (`requested_days`, `sell_days`, `request_type`, join de nome via `profiles_public`); novas ferramentas `query_vacation_balance` (`hr_vacation_periods` + `hr_vacation_conflicts`), `request_vacation` (replica o roteamento de status e o vínculo de período), `decide_vacation_request` (etapa gestor/RH, grava `hr_vacation_approvals`, `manager_*`/`hr_*` e status final) e `cancel_vacation_request` (fluxo de confirmação em duas etapas).
- Ajustar `ROLE_MODULES` para incluir `hr_vacation_requests` em todos os perfis (auto-serviço), mantendo o escopo real pelas políticas do banco; `COORDINATOR`/`manager` ganham a decisão de equipe.
- `index.ts`: registrar as ferramentas e a regra de comportamento (resolver colaborador por nome com `find_person`, nunca pedir ID, resumir antes de gravar).
- `memory.ts`: registrar as novas ferramentas de férias no rastreio de contexto.
- Deploy da função `ai-assistant`; sem mudanças de schema, políticas ou RLS.
