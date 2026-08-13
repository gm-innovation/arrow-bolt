# Nova Solicitação de Férias: modal enxuto e que rola

Três problemas no modal atual: ele não rola (cabeçalho e botões saem de vista), a lista de colaboradores já nasce aberta ocupando o formulário, e há campos que não pertencem a esta tela.

## 1. Modal com rolagem correta

- Altura máxima de ~85% da tela: título fixo no topo, botões (Cancelar / Registrar) fixos no rodapé, e só o meio do formulário rola.

## 2. Colaborador: busca fechada por padrão

- A lista começa fechada. Aparece só o campo de busca (ou o nome já selecionado com um botão "Trocar").
- A lista abre ao clicar/focar no campo de busca ou ao digitar, e fecha ao escolher um nome.
- Altura da lista limitada (~11rem) com rolagem própria.

## 3. Só férias, sem campos de outras áreas

- Sai o seletor "Tipo": esta tela é de férias, ponto. Venda de dias e adiantamento do 13º deixam de ser campos independentes aqui.
- Sai a caixa "Solicitar adiantamento da 1ª parcela do 13º" — isso passa a ser tratado na área de Solicitações.
- Sai a caixa "Dividir férias em parcelas".

## 4. Dias restantes: pergunta em vez de opção técnica

Quando o colaborador escolhe um período menor que os 30 dias de direito, o modal calcula os dias restantes e pergunta o que fazer com eles:

- **Programar depois** (padrão): os dias ficam de saldo no período aquisitivo para uma próxima solicitação.
- **Vender os dias (abono)**: até 10 dias, conforme a regra da empresa; o excedente é bloqueado com aviso e o restante volta a "programar depois".

O texto mostra sempre o resumo em linguagem simples: "20 dias de gozo · 10 dias restantes: vender (abono)".
Mínimo de 5 dias corridos por solicitação; abaixo disso o envio é bloqueado com mensagem. Data fim anterior ao início continua bloqueada.
Se a política da empresa não permitir divisão, o pedido parcial ainda pode ser enviado — só exibe aviso em âmbar, e o motor de regras registra o conflito para o RH avaliar.

## Detalhes técnicos

- `src/pages/hr/Vacations.tsx`, `NewRequestDialog`:
  - `DialogContent` com `max-h-[85vh] flex flex-col overflow-hidden p-0`; cabeçalho e `DialogFooter` fora da área rolável; corpo em `flex-1 overflow-y-auto px-6 py-4`.
  - Estado `listOpen` para a lista de colaboradores (`onFocus` abre, seleção fecha), `max-h-44 overflow-y-auto`.
  - Remover o `Select` de tipo (fixar `request_type: "vacation"`), o checkbox de 13º (`advance_13th: false`), o checkbox `isSplit` e o input livre de abono.
  - Novo estado `remainderChoice: "later" | "sell"`; `sell_days` derivado (`remainder` quando `sell`, limitado por `rules.max_dias_abono`, senão 0).
  - Dias de direito vindos do período aquisitivo escolhido automaticamente (`entitled_days - used_days - sold_days`, com fallback 30) para calcular o restante.
- Sem mudanças em hooks de dados, schema, políticas ou Edge Functions.
