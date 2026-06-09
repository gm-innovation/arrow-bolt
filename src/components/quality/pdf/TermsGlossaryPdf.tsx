import { Document, Text, View } from "@react-pdf/renderer";
import { ControlledDocPage, docStyles, type ControlledDocMeta } from "./ControlledDocPdfFrame";
import type { QualityTerm, QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";

interface Props {
  meta: Omit<ControlledDocMeta, "code" | "revisionLabel" | "title">;
  terms: QualityTerm[];
  norms?: QualityReferenceNorm[];
}

export const TermsGlossaryPdf = ({ meta, terms, norms = [] }: Props) => {
  const full: ControlledDocMeta = {
    ...meta,
    code: "SGQ-GLOSS-TERMOS",
    revisionLabel: "—",
    title: "Glossário de Termos e Definições",
    subtitleBlock: "Vocabulário comum do SGQ",
    issuedAt: new Date(),
  };
  const normMap = new Map(norms.map((n) => [n.id, n.code]));
  return (
    <Document>
      <ControlledDocPage meta={full}>
        {terms.length === 0 ? (
          <Text style={docStyles.paragraph}>Nenhum termo cadastrado.</Text>
        ) : (
          terms.map((t) => (
            <View key={t.id} style={docStyles.section} wrap={false}>
              <Text style={{ fontSize: 11, fontWeight: "bold" }}>{t.term}</Text>
              <Text style={docStyles.paragraph}>{t.definition}</Text>
              {t.source_norm_id && normMap.get(t.source_norm_id) && (
                <Text style={{ fontSize: 8, color: "#555" }}>Fonte: {normMap.get(t.source_norm_id)}</Text>
              )}
            </View>
          ))
        )}
      </ControlledDocPage>
    </Document>
  );
};

export default TermsGlossaryPdf;
