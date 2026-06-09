import { Document, Text, View } from "@react-pdf/renderer";
import { ControlledDocPage, docStyles, type ControlledDocMeta } from "./ControlledDocPdfFrame";
import { format, parseISO } from "date-fns";
import type {
  QualityObjective,
  QualityIndicator,
  QualityPlannedChange,
} from "@/hooks/useQualityPlanning";

interface Props {
  meta: Omit<ControlledDocMeta, "code" | "revisionLabel" | "title">;
  objectives: QualityObjective[];
  indicators: QualityIndicator[];
  changes: QualityPlannedChange[];
  policyVersion?: string | number | null;
  cycleLabel?: string;
}

const fmt = (d?: string | null) => (d ? format(parseISO(d), "dd/MM/yyyy") : "—");

const OBJ_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const CHG_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  implementada: "Implementada",
  rejeitada: "Rejeitada",
};

const EFF_STATUS: Record<string, string> = {
  pendente: "Pendente",
  eficaz: "Eficaz",
  parcial: "Parcial",
  nao_eficaz: "Não eficaz",
};

export const QualityPlanPdf = ({
  meta,
  objectives,
  indicators,
  changes,
  policyVersion,
  cycleLabel,
}: Props) => {
  const full: ControlledDocMeta = {
    ...meta,
    code: "SGQ-PLN-QUALIDADE",
    revisionLabel: cycleLabel || format(new Date(), "yyyy"),
    title: "Plano Anual da Qualidade",
    subtitleBlock:
      "Objetivos, indicadores e mudanças planejadas (ISO 9001 §6.2 e §6.3)" +
      (policyVersion ? ` — Política vigente v${policyVersion}` : ""),
    issuedAt: new Date(),
  };

  return (
    <Document>
      <ControlledDocPage meta={full}>
        {/* OBJETIVOS */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>1. Objetivos da Qualidade</Text>
          {objectives.length === 0 ? (
            <Text style={docStyles.paragraph}>Nenhum objetivo cadastrado.</Text>
          ) : (
            <View style={docStyles.table}>
              <View style={docStyles.thRow}>
                <Text style={[docStyles.th, { width: "12%" }]}>Código</Text>
                <Text style={[docStyles.th, { width: "38%" }]}>Título</Text>
                <Text style={[docStyles.th, { width: "20%" }]}>Ciclo</Text>
                <Text style={[docStyles.th, { width: "15%" }]}>Meta</Text>
                <Text style={[docStyles.th, { width: "15%" }]}>Status</Text>
              </View>
              {objectives.map((o) => (
                <View key={o.id} style={docStyles.tdRow} wrap={false}>
                  <Text style={[docStyles.td, { width: "12%" }]}>{o.code ?? "—"}</Text>
                  <Text style={[docStyles.td, { width: "38%" }]}>{o.title}</Text>
                  <Text style={[docStyles.td, { width: "20%" }]}>
                    {fmt(o.period_start)} → {fmt(o.period_end)}
                  </Text>
                  <Text style={[docStyles.td, { width: "15%" }]}>
                    {o.target_value != null ? `${o.target_value} ${o.unit ?? ""}` : "—"}
                  </Text>
                  <Text style={[docStyles.td, { width: "15%" }]}>{OBJ_STATUS[o.status] ?? o.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* INDICADORES */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>2. Indicadores</Text>
          {indicators.length === 0 ? (
            <Text style={docStyles.paragraph}>Nenhum indicador cadastrado.</Text>
          ) : (
            <View style={docStyles.table}>
              <View style={docStyles.thRow}>
                <Text style={[docStyles.th, { width: "12%" }]}>Código</Text>
                <Text style={[docStyles.th, { width: "40%" }]}>Indicador</Text>
                <Text style={[docStyles.th, { width: "18%" }]}>Frequência</Text>
                <Text style={[docStyles.th, { width: "15%" }]}>Meta</Text>
                <Text style={[docStyles.th, { width: "15%" }]}>Status</Text>
              </View>
              {indicators.map((i) => (
                <View key={i.id} style={docStyles.tdRow} wrap={false}>
                  <Text style={[docStyles.td, { width: "12%" }]}>{i.code ?? "—"}</Text>
                  <Text style={[docStyles.td, { width: "40%" }]}>{i.name}</Text>
                  <Text style={[docStyles.td, { width: "18%" }]}>{i.frequency}</Text>
                  <Text style={[docStyles.td, { width: "15%" }]}>
                    {i.target_value != null ? `${i.target_value} ${i.unit ?? ""}` : "—"}
                  </Text>
                  <Text style={[docStyles.td, { width: "15%" }]}>{i.status}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* MUDANÇAS PLANEJADAS */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>3. Mudanças Planejadas (§6.3)</Text>
          {changes.length === 0 ? (
            <Text style={docStyles.paragraph}>Nenhuma mudança planejada cadastrada.</Text>
          ) : (
            <View style={docStyles.table}>
              <View style={docStyles.thRow}>
                <Text style={[docStyles.th, { width: "38%" }]}>Mudança</Text>
                <Text style={[docStyles.th, { width: "14%" }]}>Tipo</Text>
                <Text style={[docStyles.th, { width: "16%" }]}>Status</Text>
                <Text style={[docStyles.th, { width: "16%" }]}>Implementação</Text>
                <Text style={[docStyles.th, { width: "16%" }]}>Eficácia</Text>
              </View>
              {changes.map((c) => (
                <View key={c.id} style={docStyles.tdRow} wrap={false}>
                  <Text style={[docStyles.td, { width: "38%" }]}>{c.title}</Text>
                  <Text style={[docStyles.td, { width: "14%" }]}>{c.change_type}</Text>
                  <Text style={[docStyles.td, { width: "16%" }]}>{CHG_STATUS[c.status] ?? c.status}</Text>
                  <Text style={[docStyles.td, { width: "16%" }]}>{fmt((c as any).implemented_at)}</Text>
                  <Text style={[docStyles.td, { width: "16%" }]}>
                    {EFF_STATUS[(c as any).effectiveness_status] ?? "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ASSINATURAS */}
        <View style={docStyles.sigBlock} wrap={false}>
          <View style={docStyles.sigCell}>
            <Text>Elaborado</Text>
            <Text>{meta.preparedBy || "—"}</Text>
          </View>
          <View style={docStyles.sigCell}>
            <Text>Verificado</Text>
            <Text>{meta.verifiedBy || "—"}</Text>
          </View>
          <View style={docStyles.sigCell}>
            <Text>Aprovado</Text>
            <Text>{meta.approvedBy || "—"}</Text>
          </View>
        </View>
      </ControlledDocPage>
    </Document>
  );
};

export default QualityPlanPdf;
