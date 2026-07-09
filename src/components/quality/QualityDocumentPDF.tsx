import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/utils";

// ------- helpers para converter JSON do Tiptap em blocos PDF -------
type Node = { type: string; content?: Node[]; text?: string; marks?: { type: string }[]; attrs?: any };

const renderInline = (nodes: Node[] | undefined, key: string) => {
  if (!nodes) return null;
  return nodes.map((n, i) => {
    if (n.type === "text") {
      const isBold = n.marks?.some((m) => m.type === "bold");
      const isItalic = n.marks?.some((m) => m.type === "italic");
      const isUnderline = n.marks?.some((m) => m.type === "underline");
      return (
        <Text
          key={`${key}-${i}`}
          style={{
            fontWeight: isBold ? "bold" : "normal",
            fontStyle: isItalic ? "italic" : "normal",
            textDecoration: isUnderline ? "underline" : "none",
          }}
        >
          {n.text || ""}
        </Text>
      );
    }
    return null;
  });
};

const renderBlocks = (nodes: Node[] | undefined): React.ReactNode => {
  if (!nodes) return null;
  return nodes.map((n, i) => {
    const key = `b-${i}`;
    if (n.type === "heading") {
      const level = n.attrs?.level || 1;
      return (
        <Text key={key} style={[styles.h, level === 1 ? styles.h1 : styles.h2]}>
          {renderInline(n.content, key)}
        </Text>
      );
    }
    if (n.type === "paragraph") {
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(n.content, key)}
        </Text>
      );
    }
    if (n.type === "bulletList" || n.type === "orderedList") {
      const ordered = n.type === "orderedList";
      return (
        <View key={key} style={{ marginVertical: 4, paddingLeft: 12 }}>
          {n.content?.map((li, idx) => (
            <View key={`${key}-li-${idx}`} style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ width: 14 }}>{ordered ? `${idx + 1}.` : "•"}</Text>
              <View style={{ flex: 1 }}>{renderBlocks(li.content)}</View>
            </View>
          ))}
        </View>
      );
    }
    if (n.type === "blockquote") {
      return (
        <View key={key} style={styles.quote}>
          {renderBlocks(n.content)}
        </View>
      );
    }
    return null;
  });
};

const styles = StyleSheet.create({
  page: { paddingTop: 90, paddingBottom: 60, paddingHorizontal: 40, fontSize: 10, fontFamily: "Helvetica" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "column" },
  companyName: { fontSize: 12, fontWeight: "bold" },
  headerRight: { flexDirection: "column", alignItems: "flex-end" },
  metaLabel: { fontSize: 7, color: "#666" },
  metaValue: { fontSize: 9, fontWeight: "bold" },
  title: { fontSize: 14, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, fontSize: 8, color: "#555" },
  h: { marginTop: 8, marginBottom: 4 },
  h1: { fontSize: 13, fontWeight: "bold" },
  h2: { fontSize: 11, fontWeight: "bold" },
  paragraph: { marginBottom: 4, lineHeight: 1.4 },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "#888",
    paddingLeft: 8,
    marginVertical: 4,
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 6,
    fontSize: 7,
    color: "#555",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  watermark: {
    position: "absolute",
    top: 320,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 80,
    color: "#000",
    opacity: 0.08,
    transform: "rotate(-30deg)",
    fontWeight: "bold",
  },
  controlledStamp: {
    position: "absolute",
    bottom: 70,
    right: 40,
    padding: 4,
    borderWidth: 1,
    borderColor: "#1d4ed8",
    color: "#1d4ed8",
    fontSize: 8,
    fontWeight: "bold",
  },
});

export interface QualityDocumentPDFProps {
  companyName?: string;
  code: string;
  title: string;
  revisionLabel: string;
  publishedAt?: string | null;
  nextReviewDate?: string | null;
  approverName?: string | null;
  preparedByName?: string | null;
  classification?: string | null;
  normativeReference?: string | null;
  richContent: any | null;
  watermark?: "uncontrolled" | "obsolete" | "draft" | null;
  controlledCopy?: { number: number; recipient?: string | null } | null;
}

export const QualityDocumentPDF = ({
  companyName,
  code,
  title,
  revisionLabel,
  publishedAt,
  nextReviewDate,
  approverName,
  preparedByName,
  classification,
  normativeReference,
  richContent,
  watermark,
  controlledCopy,
}: QualityDocumentPDFProps) => {
  const watermarkText =
    watermark === "uncontrolled"
      ? "CÓPIA NÃO CONTROLADA"
      : watermark === "obsolete"
      ? "OBSOLETO"
      : watermark === "draft"
      ? "RASCUNHO"
      : null;

  const blocks: Node[] = richContent?.content || [];

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{companyName || "Sistema da Qualidade"}</Text>
            <Text style={styles.metaLabel}>{normativeReference || ""}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.metaLabel}>Código</Text>
            <Text style={styles.metaValue}>{code}</Text>
            <Text style={styles.metaLabel}>Revisão</Text>
            <Text style={styles.metaValue}>{revisionLabel}</Text>
          </View>
        </View>

        {/* Watermark */}
        {watermarkText && (
          <Text style={styles.watermark} fixed>
            {watermarkText}
          </Text>
        )}

        {/* Title */}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.meta}>
          <Text>
            Publicado em: {publishedAt ? format(new Date(publishedAt), "dd/MM/yyyy") : "—"}
          </Text>
          <Text>
            Próxima revisão: {nextReviewDate ? formatLocalDate(nextReviewDate) : "—"}
          </Text>
          {classification && <Text>Classificação: {classification}</Text>}
        </View>

        {/* Body */}
        <View>{renderBlocks(blocks)}</View>

        {/* Controlled copy stamp */}
        {controlledCopy && (
          <Text style={styles.controlledStamp} fixed>
            CÓPIA CONTROLADA Nº {String(controlledCopy.number).padStart(3, "0")}
            {controlledCopy.recipient ? ` — ${controlledCopy.recipient}` : ""}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Elaborado: {preparedByName || "—"} · Aprovado: {approverName || "—"}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};

export default QualityDocumentPDF;
