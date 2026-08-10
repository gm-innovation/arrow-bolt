import { parseISO, differenceInCalendarDays } from "date-fns";
import { formatLocalDate } from "@/lib/utils";

export type DocComplianceStatus = "none" | "valid" | "expiring" | "expired";

export interface DocLike {
  label: string;
  expiry_date: string | null | undefined;
}

export interface DocComplianceResult {
  status: DocComplianceStatus;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  /** Motivo do status (ex.: "NR 34 vencida em 28/07/2026") */
  detail: string | null;
  daysLeft: number | null;
}

const EXPIRING_WINDOW_DAYS = 30;

/** Dias restantes até a validade, sem deslocamento de fuso. */
export function daysUntil(date: string): number {
  return differenceInCalendarDays(parseISO(date), new Date());
}

export function statusFromExpiry(
  expiry: string | null | undefined,
  windowDays = EXPIRING_WINDOW_DAYS
): { status: DocComplianceStatus; daysLeft: number | null } {
  if (!expiry) return { status: "none", daysLeft: null };
  const daysLeft = daysUntil(expiry);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= windowDays) return { status: "expiring", daysLeft };
  return { status: "valid", daysLeft };
}

const RANK: Record<DocComplianceStatus, number> = {
  expired: 3,
  expiring: 2,
  valid: 1,
  none: 0,
};

const STATUS_META: Record<
  DocComplianceStatus,
  { label: string; variant: DocComplianceResult["variant"] }
> = {
  expired: { label: "Vencido", variant: "destructive" },
  expiring: { label: "A vencer", variant: "secondary" },
  valid: { label: "Válido", variant: "default" },
  none: { label: "—", variant: "secondary" },
};

/**
 * Agrega ASO + certificações e devolve a pior situação encontrada,
 * com o documento responsável no `detail`.
 */
export function aggregateDocCompliance(docs: DocLike[]): DocComplianceResult {
  let worst: DocComplianceStatus = "none";
  let worstDoc: { label: string; expiry: string; daysLeft: number } | null = null;

  for (const doc of docs) {
    if (!doc.expiry_date) continue;
    const { status, daysLeft } = statusFromExpiry(doc.expiry_date);
    if (RANK[status] > RANK[worst]) {
      worst = status;
      worstDoc = { label: doc.label, expiry: doc.expiry_date, daysLeft: daysLeft ?? 0 };
    }
  }

  const meta = STATUS_META[worst];
  let detail: string | null = null;
  if (worstDoc) {
    const when = formatLocalDate(worstDoc.expiry);
    detail =
      worst === "expired"
        ? `${worstDoc.label} vencido em ${when}`
        : worst === "expiring"
        ? `${worstDoc.label} vence em ${when} (${worstDoc.daysLeft}d)`
        : `${worstDoc.label} válido até ${when}`;
  }

  return {
    status: worst,
    label: meta.label,
    variant: meta.variant,
    detail,
    daysLeft: worstDoc?.daysLeft ?? null,
  };
}

/** Rótulo curto de um documento técnico. */
export function techDocLabel(doc: { document_type?: string | null; certificate_name?: string | null; file_name?: string | null }): string {
  if (doc.document_type === "aso") return "ASO";
  return doc.certificate_name || doc.file_name || "Certificação";
}
