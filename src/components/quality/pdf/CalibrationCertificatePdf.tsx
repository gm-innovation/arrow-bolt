import { Document, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ControlledDocPage, docStyles, type ControlledDocMeta } from "./ControlledDocPdfFrame";
import { formatLocalDate } from "@/lib/utils";

export interface CalibrationCheckpoint {
  nominal_value?: number | string | null;
  measured_value?: number | string | null;
  error?: number | string | null;
  tolerance?: number | string | null;
  pass?: boolean | null;
  notes?: string | null;
}

export interface CalibrationCertificateData {
  certificate_number?: string | null;
  calibration_date: string;
  valid_until?: string | null;
  next_due_at?: string | null;
  kind: string;
  result: string;
  measurement_uncertainty?: string | null;
  traceability?: string | null;
  restrictions?: string | null;
  notes?: string | null;
  provider_name?: string | null;
  performed_by_name?: string | null;
  device: {
    code: string;
    name: string;
    manufacturer?: string | null;
    model?: string | null;
    serial_number?: string | null;
    measurement_range?: string | null;
    unit?: string | null;
    resolution?: string | null;
    accuracy?: string | null;
    location?: string | null;
  };
  checkpoints?: CalibrationCheckpoint[];
}

const KIND: Record<string, string> = {
  external_lab: "Laboratório externo",
  internal: "Interna",
  manufacturer: "Fabricante",
  self_check: "Verificação",
};
const RESULT: Record<string, string> = {
  approved: "APROVADO",
  approved_with_restriction: "APROVADO COM RESTRIÇÃO",
  reproved: "REPROVADO",
};

const dt = (s?: string | null) => (s ? formatLocalDate(s) : "—");

export interface CalibrationCertificatePdfProps {
  meta: Omit<ControlledDocMeta, "code" | "title" | "revisionLabel" | "subtitleBlock" | "issuedAt" | "validUntil">;
  cal: CalibrationCertificateData;
}

export const CalibrationCertificatePdf = ({ meta, cal }: CalibrationCertificatePdfProps) => {
  const docMeta: ControlledDocMeta = {
    ...meta,
    code: cal.certificate_number || `CAL-${cal.device.code}`,
    revisionLabel: "Rev. 00",
    title: "Certificado de Aferição",
    subtitle: meta.subtitle ?? "ISO 9001:2015 — §7.1.5",
    subtitleBlock: `${cal.device.code} — ${cal.device.name}`,
    issuedAt: cal.calibration_date,
    validUntil: cal.valid_until || cal.next_due_at || null,
    watermark: meta.watermark ?? "controlled",
  };

  const resultColor =
    cal.result === "reproved" ? "#b91c1c" :
    cal.result === "approved_with_restriction" ? "#b45309" :
    "#15803d";

  return (
    <Document>
      <ControlledDocPage meta={docMeta}>
        {/* Resultado */}
        <View style={[docStyles.section, { borderWidth: 1, borderColor: resultColor, padding: 8, alignItems: "center" }]}>
          <Text style={{ fontSize: 9, color: "#555" }}>Resultado da Aferição</Text>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: resultColor, marginTop: 2 }}>
            {RESULT[cal.result] ?? cal.result}
          </Text>
        </View>

        {/* Instrumento */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>1. Identificação do Instrumento</Text>
          <View style={docStyles.row}><Text style={docStyles.label}>Código:</Text><Text style={docStyles.value}>{cal.device.code}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Descrição:</Text><Text style={docStyles.value}>{cal.device.name}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Fabricante / Modelo:</Text><Text style={docStyles.value}>{[cal.device.manufacturer, cal.device.model].filter(Boolean).join(" / ") || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Nº Série:</Text><Text style={docStyles.value}>{cal.device.serial_number || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Faixa:</Text><Text style={docStyles.value}>{cal.device.measurement_range || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Unidade:</Text><Text style={docStyles.value}>{cal.device.unit || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Resolução:</Text><Text style={docStyles.value}>{cal.device.resolution || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Exatidão:</Text><Text style={docStyles.value}>{cal.device.accuracy || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Local:</Text><Text style={docStyles.value}>{cal.device.location || "—"}</Text></View>
        </View>

        {/* Aferição */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>2. Dados da Aferição</Text>
          <View style={docStyles.row}><Text style={docStyles.label}>Tipo:</Text><Text style={docStyles.value}>{KIND[cal.kind] ?? cal.kind}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Data:</Text><Text style={docStyles.value}>{dt(cal.calibration_date)}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Válido até:</Text><Text style={docStyles.value}>{dt(cal.valid_until)}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Próxima aferição:</Text><Text style={docStyles.value}>{dt(cal.next_due_at)}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Nº certificado:</Text><Text style={docStyles.value}>{cal.certificate_number || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Executante:</Text><Text style={docStyles.value}>{cal.performed_by_name || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Fornecedor:</Text><Text style={docStyles.value}>{cal.provider_name || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Incerteza:</Text><Text style={docStyles.value}>{cal.measurement_uncertainty || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Rastreabilidade:</Text><Text style={docStyles.value}>{cal.traceability || "—"}</Text></View>
        </View>

        {/* Checkpoints */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>3. Pontos de Verificação</Text>
          {cal.checkpoints && cal.checkpoints.length > 0 ? (
            <View style={docStyles.table}>
              <View style={docStyles.thRow}>
                <Text style={[docStyles.th, { flex: 1 }]}>Nominal</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Medido</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Erro</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Tolerância</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Status</Text>
                <Text style={[docStyles.th, { flex: 2 }]}>Observações</Text>
              </View>
              {cal.checkpoints.map((c, i) => (
                <View key={i} style={docStyles.tdRow}>
                  <Text style={[docStyles.td, { flex: 1 }]}>{c.nominal_value ?? "—"}</Text>
                  <Text style={[docStyles.td, { flex: 1 }]}>{c.measured_value ?? "—"}</Text>
                  <Text style={[docStyles.td, { flex: 1 }]}>{c.error ?? "—"}</Text>
                  <Text style={[docStyles.td, { flex: 1 }]}>{c.tolerance ?? "—"}</Text>
                  <Text style={[docStyles.td, { flex: 1, color: c.pass === false ? "#b91c1c" : "#15803d" }]}>
                    {c.pass === false ? "Falhou" : c.pass === true ? "OK" : "—"}
                  </Text>
                  <Text style={[docStyles.td, { flex: 2 }]}>{c.notes || ""}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={docStyles.paragraph}>Nenhum ponto de verificação registrado.</Text>
          )}
        </View>

        {/* Restrições / Observações */}
        {(cal.restrictions || cal.notes) && (
          <View style={docStyles.section}>
            <Text style={docStyles.sectionTitle}>4. Restrições e Observações</Text>
            {cal.restrictions ? <Text style={docStyles.paragraph}>Restrições: {cal.restrictions}</Text> : null}
            {cal.notes ? <Text style={docStyles.paragraph}>Observações: {cal.notes}</Text> : null}
          </View>
        )}

        {/* Assinaturas */}
        <View style={docStyles.sigBlock}>
          <View style={docStyles.sigCell}><Text>Executante</Text><Text>{cal.performed_by_name || "—"}</Text></View>
          <View style={docStyles.sigCell}><Text>Responsável Técnico</Text><Text>{meta.verifiedBy || "—"}</Text></View>
          <View style={docStyles.sigCell}><Text>Gestor da Qualidade</Text><Text>{meta.approvedBy || "—"}</Text></View>
        </View>
      </ControlledDocPage>
    </Document>
  );
};

export default CalibrationCertificatePdf;
