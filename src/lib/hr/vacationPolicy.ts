/**
 * Política de solicitação de férias (Lecsor Technology).
 *
 * Padrões aceitos sem exceção:
 *  - 30 dias de gozo, sem venda de dias;
 *  - 20 dias de gozo + venda de 10 dias (abono).
 *
 * Qualquer outra combinação é exceção: exige justificativa e autorização da Diretoria.
 * Mínimos legais: primeira parcela do período aquisitivo com 14 dias corridos,
 * parcelas seguintes com 5 dias corridos. Abono limitado a 10 dias.
 */

export const MAX_SELL_DAYS = 10;
export const MIN_FIRST_INSTALLMENT_DAYS = 14;
export const MIN_OTHER_INSTALLMENT_DAYS = 5;

export interface VacationPolicyInput {
  days: number;
  sellDays: number;
  /** true quando ainda não existe outra solicitação ativa no mesmo período aquisitivo */
  isFirstInstallment: boolean;
  maxSell?: number;
}

export interface VacationPolicyResult {
  minDays: number;
  belowMinimum: boolean;
  isStandard: boolean;
  isException: boolean;
  requiresJustification: boolean;
  /** abono efetivo, já limitado ao teto da empresa */
  effectiveSellDays: number;
  sellCapped: boolean;
  /** descrição curta do enquadramento, para exibir ao usuário */
  label: string;
}

export function classifyVacationRequest({
  days,
  sellDays,
  isFirstInstallment,
  maxSell = MAX_SELL_DAYS,
}: VacationPolicyInput): VacationPolicyResult {
  const minDays = isFirstInstallment ? MIN_FIRST_INSTALLMENT_DAYS : MIN_OTHER_INSTALLMENT_DAYS;
  const belowMinimum = days > 0 && days < minDays;
  const cap = Math.min(maxSell, MAX_SELL_DAYS);
  const effectiveSellDays = Math.max(0, Math.min(sellDays, cap));
  const sellCapped = sellDays > cap;

  const isStandard =
    (days === 30 && effectiveSellDays === 0) || (days === 20 && effectiveSellDays === 10);
  const isException = days > 0 && !isStandard;

  const label = !days
    ? ""
    : isStandard
      ? effectiveSellDays > 0
        ? "Solicitação padrão: 20 dias de gozo + 10 dias de abono"
        : "Solicitação padrão: 30 dias de gozo"
      : "Exceção — depende de autorização da Diretoria";

  return {
    minDays,
    belowMinimum,
    isStandard,
    isException,
    requiresJustification: isException,
    effectiveSellDays,
    sellCapped,
    label,
  };
}

export const ACTIVE_REQUEST_STATUSES = [
  "draft",
  "pending_manager",
  "pending_director",
  "pending_hr",
  "approved",
  "em_gozo",
];
