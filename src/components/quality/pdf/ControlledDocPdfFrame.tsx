import { Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { ReactNode } from "react";

export type ControlledWatermark = "uncontrolled" | "obsolete" | "draft" | "controlled" | null;

export interface ControlledDocMeta {
  /** Empresa (cabeçalho à esquerda) */
  companyName: string;
  /** Texto pequeno abaixo do nome da empresa (ex: referência normativa) */
  subtitle?: string | null;
  /** Logo URL — quando ausente, mostra somente o nome da empresa */
  logoUrl?: string | null;
  /** Cor primária (header/borda) */
  primaryColor?: string;
  /** Código do documento (cabeçalho direito) */
  code: string;
  /** Rótulo de revisão (ex: "Rev. 02") */
  revisionLabel: string;
  /** Título grande no topo do conteúdo */
  title: string;
  /** Subtítulo opcional abaixo do título */
  subtitleBlock?: string | null;
  /** Data principal (ex: emissão) */
  issuedAt?: string | Date | null;
  /** Data de validade / próxima revisão */
  validUntil?: string | Date | null;
  /** Linha de rodapé adicional (texto livre) */
  footerText?: string | null;
  /** Elaborado por */
  preparedBy?: string | null;
  /** Verificado por */
  verifiedBy?: string | null;
  /** Aprovado por */
  approvedBy?: string | null;
  /** Marca d'água */
  watermark?: ControlledWatermark;
  /** Cópia controlada (carimbo no rodapé direito) */
  controlledCopy?: { number: number; recipient?: string | null } | null;
}

const fmt = (d?: string | Date | null) => {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return format(dt, "dd/MM/yyyy");
};

const styles = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 64, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingHorizontal: 36, paddingTop: 18, paddingBottom: 8,
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 88, height: 36, objectFit: "contain" },
  companyBlock: { flexDirection: "column" },
  companyName: { fontSize: 11, fontWeight: "bold" },
  subtitle: { fontSize: 7, color: "#666" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  metaLabel: { fontSize: 6.5, color: "#666" },
  metaValue: { fontSize: 9, fontWeight: "bold" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  titleSub: { fontSize: 9, color: "#444", marginBottom: 10, textAlign: "center" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, fontSize: 8, color: "#555" },
  watermark: {
    position: "absolute",
    top: 320, left: 0, right: 0,
    textAlign: "center",
    fontSize: 80, color: "#000", opacity: 0.07,
    transform: "rotate(-30deg)",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 20, left: 36, right: 36,
    borderTopWidth: 1, borderTopColor: "#333",
    paddingTop: 6, fontSize: 7, color: "#555",
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  controlledStamp: {
    position: "absolute",
    bottom: 64, right: 36,
    padding: 4, borderWidth: 1, borderColor: "#1d4ed8",
    color: "#1d4ed8", fontSize: 8, fontWeight: "bold",
  },
});

const watermarkText = (w?: ControlledWatermark) => {
  switch (w) {
    case "uncontrolled": return "CÓPIA NÃO CONTROLADA";
    case "obsolete":     return "OBSOLETO";
    case "draft":        return "RASCUNHO";
    default: return null;
  }
};

export interface ControlledDocPageProps {
  meta: ControlledDocMeta;
  children: ReactNode;
}

/**
 * Página A4 controlada (cabeçalho + rodapé + marca d'água + carimbo).
 * Use dentro de um <Document>. O conteúdo flui em children.
 */
export const ControlledDocPage = ({ meta, children }: ControlledDocPageProps) => {
  const primary = meta.primaryColor || "#0f172a";
  const wm = watermarkText(meta.watermark);
  return (
    <Page size="A4" style={styles.page} wrap>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: primary }]} fixed>
        <View style={styles.headerLeft}>
          {meta.logoUrl ? <Image src={meta.logoUrl} style={styles.logo} /> : null}
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{meta.companyName}</Text>
            {meta.subtitle ? <Text style={styles.subtitle}>{meta.subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.metaLabel}>Código</Text>
          <Text style={styles.metaValue}>{meta.code}</Text>
          <Text style={styles.metaLabel}>Revisão</Text>
          <Text style={styles.metaValue}>{meta.revisionLabel}</Text>
        </View>
      </View>

      {wm && (<Text style={styles.watermark} fixed>{wm}</Text>)}

      <Text style={styles.title}>{meta.title}</Text>
      {meta.subtitleBlock ? <Text style={styles.titleSub}>{meta.subtitleBlock}</Text> : null}
      <View style={styles.metaRow}>
        <Text>Emissão: {fmt(meta.issuedAt)}</Text>
        <Text>Validade / Próx. revisão: {fmt(meta.validUntil)}</Text>
      </View>

      {/* Body */}
      <View>{children}</View>

      {/* Controlled copy stamp */}
      {meta.controlledCopy && (
        <Text style={styles.controlledStamp} fixed>
          CÓPIA CONTROLADA Nº {String(meta.controlledCopy.number).padStart(3, "0")}
          {meta.controlledCopy.recipient ? ` — ${meta.controlledCopy.recipient}` : ""}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer} fixed>
        <View style={styles.footerRow}>
          <Text>
            Elaborado: {meta.preparedBy || "—"}
            {meta.verifiedBy ? ` · Verificado: ${meta.verifiedBy}` : ""}
            {meta.approvedBy ? ` · Aprovado: ${meta.approvedBy}` : ""}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
        {meta.footerText ? <Text>{meta.footerText}</Text> : null}
      </View>
    </Page>
  );
};

// Estilos auxiliares para conteúdo dos PDFs concretos
export const docStyles = StyleSheet.create({
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10, fontWeight: "bold",
    backgroundColor: "#f1f5f9",
    paddingVertical: 3, paddingHorizontal: 6,
    marginBottom: 4,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, color: "#555" },
  value: { flex: 1 },
  paragraph: { marginBottom: 4, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: "#cbd5e1", marginVertical: 4 },
  thRow: { flexDirection: "row", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderBottomColor: "#cbd5e1" },
  tdRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0" },
  th: { padding: 4, fontWeight: "bold", fontSize: 9 },
  td: { padding: 4, fontSize: 9 },
  sigBlock: { marginTop: 30, flexDirection: "row", justifyContent: "space-around" },
  sigCell: { width: "30%", borderTopWidth: 1, borderTopColor: "#333", paddingTop: 3, textAlign: "center", fontSize: 8 },
});
