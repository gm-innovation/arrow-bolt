import { Document } from "@react-pdf/renderer";
import { Text, View } from "@react-pdf/renderer";
import { ControlledDocPage, docStyles, type ControlledDocMeta } from "./ControlledDocPdfFrame";
import type { QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/utils";

interface Props {
  meta: Omit<ControlledDocMeta, "code" | "revisionLabel" | "title">;
  norms: QualityReferenceNorm[];
}

const fmt = (d?: string | null) => (d ? formatLocalDate(d) : "—");

export const NormsRegisterPdf = ({ meta, norms }: Props) => {
  const full: ControlledDocMeta = {
    ...meta,
    code: "SGQ-REG-NORMAS",
    revisionLabel: "—",
    title: "Lista Mestra de Referências Normativas",
    subtitleBlock: "Documentos de origem externa aplicáveis ao SGQ",
    issuedAt: new Date(),
  };
  return (
    <Document>
      <ControlledDocPage meta={full}>
        <View style={docStyles.table}>
          <View style={docStyles.thRow}>
            <Text style={[docStyles.th, { width: "16%" }]}>Código</Text>
            <Text style={[docStyles.th, { width: "34%" }]}>Título</Text>
            <Text style={[docStyles.th, { width: "12%" }]}>Emissor</Text>
            <Text style={[docStyles.th, { width: "10%" }]}>Revisão</Text>
            <Text style={[docStyles.th, { width: "14%" }]}>Vigência</Text>
            <Text style={[docStyles.th, { width: "14%" }]}>Próx. Revisão</Text>
          </View>
          {norms.length === 0 && (
            <View style={docStyles.tdRow}><Text style={[docStyles.td, { width: "100%" }]}>Nenhuma norma cadastrada.</Text></View>
          )}
          {norms.map((n) => (
            <View key={n.id} style={docStyles.tdRow} wrap={false}>
              <Text style={[docStyles.td, { width: "16%" }]}>{n.code}</Text>
              <Text style={[docStyles.td, { width: "34%" }]}>{n.title}</Text>
              <Text style={[docStyles.td, { width: "12%" }]}>{n.issuer || "—"}</Text>
              <Text style={[docStyles.td, { width: "10%" }]}>{(n as any).revision || "—"}</Text>
              <Text style={[docStyles.td, { width: "14%" }]}>{fmt(n.valid_from)} - {fmt(n.valid_until)}</Text>
              <Text style={[docStyles.td, { width: "14%" }]}>{fmt((n as any).next_review_due_at)}</Text>
            </View>
          ))}
        </View>
      </ControlledDocPage>
    </Document>
  );
};

export default NormsRegisterPdf;
