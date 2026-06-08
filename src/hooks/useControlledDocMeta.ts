import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ControlledDocMeta } from "@/components/quality/pdf/ControlledDocPdfFrame";

/**
 * Monta o "meta" padrão de cabeçalho/rodapé/layout para qualquer PDF controlado
 * do módulo Qualidade — consome quality_settings.document_layout e a empresa.
 */
export const useControlledDocMeta = () => {
  const { settings } = useQualitySettings();
  const { profile } = useAuth();

  const layout = ((settings as any)?.document_layout ?? {}) as {
    header_text?: string;
    footer_text?: string;
    logo_url?: string;
    primary_color?: string;
    uncontrolled_watermark?: boolean;
  };

  const { data: company } = useQuery({
    queryKey: ["company_name_for_pdf", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name, cnpj")
        .eq("id", profile!.company_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const baseMeta: Partial<ControlledDocMeta> = {
    companyName: company?.name || "Sistema da Qualidade",
    subtitle: layout.header_text || undefined,
    logoUrl: layout.logo_url || undefined,
    primaryColor: layout.primary_color || "#0f172a",
    footerText: layout.footer_text || undefined,
    watermark: layout.uncontrolled_watermark ? "uncontrolled" : "controlled",
  };

  return { baseMeta, layout, company };
};
