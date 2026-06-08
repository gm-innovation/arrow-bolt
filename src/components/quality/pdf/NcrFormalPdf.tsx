import { Document, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { ControlledDocPage, docStyles, type ControlledDocMeta } from "./ControlledDocPdfFrame";

export interface NcrFormalPdfData {
  ncr_number: number | string;
  title: string;
  description?: string | null;
  ncr_type: string;
  severity: string;
  status: string;
  source?: string | null;
  affected_area?: string | null;
  root_cause?: string | null;
  immediate_action?: string | null;
  detected_at?: string | null;
  deadline?: string | null;
  closed_at?: string | null;
  verification_notes?: string | null;
  responsible_name?: string | null;
  detected_by_name?: string | null;
  closed_by_name?: string | null;
  action_items?: Array<{
    title?: string | null;
    description?: string | null;
    responsible?: string | null;
    due_at?: string | null;
    status?: string | null;
  }>;
}

const TYPE: Record<string, string> = {
  internal: "Interna", external: "Externa", supplier: "Fornecedor", process: "Processo",
};
const SEV: Record<string, string> = { minor: "Menor", major: "Maior", critical: "Crítica" };
const STATUS: Record<string, string> = {
  open: "Aberta", analysis: "Em Análise", action_plan: "Plano de Ação",
  verification: "Verificação", closed: "Encerrada", cancelled: "Cancelada",
};

const dt = (s?: string | null) => (s ? format(new Date(s), "dd/MM/yyyy") : "—");

export interface NcrFormalPdfProps {
  meta: Omit<ControlledDocMeta, "code" | "title" | "revisionLabel" | "subtitleBlock" | "issuedAt">;
  ncr: NcrFormalPdfData;
}

/** PDF formal de Registro de Não Conformidade (RNC) */
export const NcrFormalPdf = ({ meta, ncr }: NcrFormalPdfProps) => {
  const docMeta: ControlledDocMeta = {
    ...meta,
    code: `RNC-${String(ncr.ncr_number).padStart(4, "0")}`,
    revisionLabel: `Rev. 00`,
    title: `Registro de Não Conformidade`,
    subtitle: meta.subtitle ?? "ISO 9001:2015 — §10.2",
    subtitleBlock: ncr.title,
    issuedAt: ncr.detected_at ?? new Date().toISOString(),
    validUntil: ncr.deadline ?? null,
    watermark: meta.watermark ?? "controlled",
  };

  return (
    <Document>
      <ControlledDocPage meta={docMeta}>
        {/* Identificação */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>1. Identificação</Text>
          <View style={docStyles.row}><Text style={docStyles.label}>Número:</Text><Text style={docStyles.value}>RNC-{String(ncr.ncr_number).padStart(4, "0")}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Tipo:</Text><Text style={docStyles.value}>{TYPE[ncr.ncr_type] ?? ncr.ncr_type}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Severidade:</Text><Text style={docStyles.value}>{SEV[ncr.severity] ?? ncr.severity}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Status:</Text><Text style={docStyles.value}>{STATUS[ncr.status] ?? ncr.status}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Origem:</Text><Text style={docStyles.value}>{ncr.source || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Área afetada:</Text><Text style={docStyles.value}>{ncr.affected_area || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Detectada em:</Text><Text style={docStyles.value}>{dt(ncr.detected_at)}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Detectada por:</Text><Text style={docStyles.value}>{ncr.detected_by_name || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Responsável:</Text><Text style={docStyles.value}>{ncr.responsible_name || "—"}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Prazo:</Text><Text style={docStyles.value}>{dt(ncr.deadline)}</Text></View>
        </View>

        {/* Descrição */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>2. Descrição da Não Conformidade</Text>
          <Text style={docStyles.paragraph}>{ncr.description || "—"}</Text>
        </View>

        {/* Ação imediata */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>3. Ação imediata (contenção)</Text>
          <Text style={docStyles.paragraph}>{ncr.immediate_action || "—"}</Text>
        </View>

        {/* Causa raiz */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>4. Análise de causa raiz</Text>
          <Text style={docStyles.paragraph}>{ncr.root_cause || "—"}</Text>
        </View>

        {/* Plano de ação */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>5. Plano de Ação</Text>
          {ncr.action_items && ncr.action_items.length > 0 ? (
            <View style={docStyles.table}>
              <View style={docStyles.thRow}>
                <Text style={[docStyles.th, { flex: 3 }]}>Ação</Text>
                <Text style={[docStyles.th, { flex: 2 }]}>Responsável</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Prazo</Text>
                <Text style={[docStyles.th, { flex: 1 }]}>Status</Text>
              </View>
              {ncr.action_items.map((a, i) => (
                <View key={i} style={docStyles.tdRow}>
                  <Text style={[docStyles.td, { flex: 3 }]}>{a.title || a.description || "—"}</Text>
                  <Text style={[docStyles.td, { flex: 2 }]}>{a.responsible || "—"}</Text>
                  <Text style={[docStyles.td, { flex: 1 }]}>{dt(a.due_at)}</Text>
                  <Text style={[docStyles.td, { flex: 1 }]}>{a.status || "—"}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={docStyles.paragraph}>Nenhuma ação registrada.</Text>
          )}
        </View>

        {/* Verificação / Encerramento */}
        <View style={docStyles.section}>
          <Text style={docStyles.sectionTitle}>6. Verificação de Eficácia e Encerramento</Text>
          <Text style={docStyles.paragraph}>{ncr.verification_notes || "—"}</Text>
          <View style={docStyles.row}><Text style={docStyles.label}>Encerrada em:</Text><Text style={docStyles.value}>{dt(ncr.closed_at)}</Text></View>
          <View style={docStyles.row}><Text style={docStyles.label}>Encerrada por:</Text><Text style={docStyles.value}>{ncr.closed_by_name || "—"}</Text></View>
        </View>

        {/* Assinaturas */}
        <View style={docStyles.sigBlock}>
          <View style={docStyles.sigCell}><Text>Elaboração</Text><Text>{ncr.detected_by_name || meta.preparedBy || "—"}</Text></View>
          <View style={docStyles.sigCell}><Text>Responsável Técnico</Text><Text>{ncr.responsible_name || meta.verifiedBy || "—"}</Text></View>
          <View style={docStyles.sigCell}><Text>Gestor da Qualidade</Text><Text>{meta.approvedBy || "—"}</Text></View>
        </View>
      </ControlledDocPage>
    </Document>
  );
};

export default NcrFormalPdf;
