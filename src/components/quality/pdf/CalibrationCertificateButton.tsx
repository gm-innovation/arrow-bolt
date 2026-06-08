import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useControlledDocMeta } from "@/hooks/useControlledDocMeta";
import QualityPdfPreviewButton from "./QualityPdfPreviewButton";
import CalibrationCertificatePdf, { type CalibrationCertificateData } from "./CalibrationCertificatePdf";
import type { QualityMeasuringDevice } from "@/hooks/useQualityDevices";

interface CalibrationCertificateButtonProps {
  calibrationId: string;
  device: QualityMeasuringDevice;
  iconOnly?: boolean;
}

export const CalibrationCertificateButton = ({ calibrationId, device, iconOnly }: CalibrationCertificateButtonProps) => {
  const { baseMeta } = useControlledDocMeta();

  const { data, isLoading } = useQuery({
    queryKey: ["calibration_pdf_data", calibrationId],
    queryFn: async () => {
      const { data: cal, error } = await supabase
        .from("quality_calibrations" as any)
        .select("*")
        .eq("id", calibrationId)
        .maybeSingle();
      if (error) throw error;
      if (!cal) return null;

      let provider_name: string | null = null;
      if ((cal as any).provider_supplier_id) {
        const { data: sup } = await supabase
          .from("quality_suppliers" as any)
          .select("name")
          .eq("id", (cal as any).provider_supplier_id)
          .maybeSingle();
        provider_name = (sup as any)?.name ?? null;
      }

      let performed_by_name: string | null = null;
      if ((cal as any).performed_by_user_id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", (cal as any).performed_by_user_id)
          .maybeSingle();
        performed_by_name = (p as any)?.full_name ?? null;
      }

      const { data: cps } = await supabase
        .from("quality_calibration_checkpoints" as any)
        .select("*")
        .eq("calibration_id", calibrationId)
        .order("created_at", { ascending: true });

      const payload: CalibrationCertificateData = {
        certificate_number: (cal as any).certificate_number,
        calibration_date: (cal as any).calibration_date,
        valid_until: (cal as any).valid_until,
        next_due_at: (cal as any).next_due_at,
        kind: (cal as any).kind,
        result: (cal as any).result,
        measurement_uncertainty: (cal as any).measurement_uncertainty,
        traceability: (cal as any).traceability,
        restrictions: (cal as any).restrictions,
        notes: (cal as any).notes,
        provider_name,
        performed_by_name,
        device: {
          code: device.code,
          name: device.name,
          manufacturer: device.manufacturer,
          model: device.model,
          serial_number: device.serial_number,
          measurement_range: device.measurement_range,
          unit: device.unit,
          resolution: device.resolution,
          accuracy: device.accuracy,
          location: device.location,
        },
        checkpoints: (cps ?? []) as any,
      };
      return payload;
    },
  });

  if (isLoading || !data || !baseMeta.companyName) return null;

  return (
    <QualityPdfPreviewButton
      iconOnly={iconOnly}
      buttonLabel="Certificado"
      dialogTitle={`Certificado de Aferição — ${device.code}`}
      fileName={`Certificado-${device.code}-${data.calibration_date}.pdf`}
      document={<CalibrationCertificatePdf meta={baseMeta as any} cal={data} />}
    />
  );
};

export default CalibrationCertificateButton;
