import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type DeviceStatus = "active" | "in_calibration" | "out_of_service" | "retired" | "overdue";
export type DeviceCriticality = "low" | "medium" | "high" | "critical";
export type CalibrationKind = "internal" | "external_lab" | "manufacturer" | "self_check";
export type CalibrationResult = "approved" | "approved_with_restriction" | "reproved";

export interface QualityMeasuringDevice {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  measurement_range: string | null;
  unit: string | null;
  resolution: string | null;
  accuracy: string | null;
  location: string | null;
  responsible_user_id: string | null;
  status: DeviceStatus;
  criticality: DeviceCriticality;
  calibration_frequency_months: number;
  last_calibration_at: string | null;
  next_calibration_due: string | null;
  acquired_at: string | null;
  retired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceFilters {
  status?: DeviceStatus | "all";
  criticality?: DeviceCriticality | "all";
  onlyOverdue?: boolean;
  search?: string;
}

export const useQualityDevices = (filters: DeviceFilters = {}) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  // Refresh on-mount: marca como 'overdue' instrumentos vencidos
  useEffect(() => {
    if (!companyId) return;
    (supabase.rpc as any)("quality_device_status_refresh").then(() => {
      qc.invalidateQueries({ queryKey: ["quality_devices"] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const list = useQuery({
    queryKey: ["quality_devices", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = (supabase.from("quality_measuring_devices" as any) as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("code", { ascending: true });
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.criticality && filters.criticality !== "all") q = q.eq("criticality", filters.criticality);
      if (filters.search) q = q.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      let items = (data ?? []) as unknown as QualityMeasuringDevice[];
      if (filters.onlyOverdue) {
        const today = new Date().toISOString().slice(0, 10);
        items = items.filter((d) => d.next_calibration_due && d.next_calibration_due < today);
      }
      return items;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<QualityMeasuringDevice> & { code: string; name: string }) => {
      const payload: any = { ...input };
      if (!input.id) {
        payload.company_id = companyId;
        payload.created_by = user?.id ?? null;
      }
      const { data, error } = input.id
        ? await (supabase.from("quality_measuring_devices" as any) as any).update(payload).eq("id", input.id).select().single()
        : await (supabase.from("quality_measuring_devices" as any) as any).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_devices"] });
      toast({ title: "Instrumento salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("quality_measuring_devices" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_devices"] });
      toast({ title: "Instrumento removido" });
    },
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};

export const useQualityDevice = (id?: string) =>
  useQuery({
    queryKey: ["quality_device", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_measuring_devices" as any) as any)
        .select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as QualityMeasuringDevice | null;
    },
  });

// ============= Calibrations =============
export interface QualityCalibration {
  id: string;
  company_id: string;
  device_id: string;
  kind: CalibrationKind;
  calibration_date: string;
  result: CalibrationResult;
  provider_supplier_id: string | null;
  certificate_number: string | null;
  certificate_file_url: string | null;
  certificate_file_name: string | null;
  cost: number | null;
  measurement_uncertainty: string | null;
  traceability: string | null;
  valid_until: string | null;
  restrictions: string | null;
  next_due_at: string | null;
  performed_by_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalibrationCheckpoint {
  id: string;
  calibration_id: string;
  nominal_value: number | null;
  measured_value: number | null;
  error: number | null;
  tolerance: number | null;
  pass: boolean | null;
  notes: string | null;
}

export const useQualityCalibrations = (deviceId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_calibrations", deviceId],
    enabled: !!deviceId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_calibrations" as any) as any)
        .select("*")
        .eq("device_id", deviceId!)
        .order("calibration_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as QualityCalibration[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      device_id: string;
      kind: CalibrationKind;
      calibration_date: string;
      result: CalibrationResult;
      provider_supplier_id?: string | null;
      certificate_number?: string | null;
      certificate_file_url?: string | null;
      certificate_file_name?: string | null;
      cost?: number | null;
      measurement_uncertainty?: string | null;
      traceability?: string | null;
      valid_until?: string | null;
      restrictions?: string | null;
      next_due_at?: string | null;
      notes?: string | null;
      checkpoints?: Array<Omit<CalibrationCheckpoint, "id" | "calibration_id">>;
    }) => {
      const { checkpoints, ...rest } = input;
      const { data: cal, error } = await (supabase.from("quality_calibrations" as any) as any)
        .insert({
          ...rest,
          company_id: companyId,
          performed_by_user_id: user?.id ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      if (checkpoints && checkpoints.length > 0) {
        const rows = checkpoints.map((c) => ({ ...c, calibration_id: cal.id }));
        const { error: e2 } = await (supabase.from("quality_calibration_checkpoints" as any) as any).insert(rows);
        if (e2) throw e2;
      }
      return cal;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quality_calibrations", vars.device_id] });
      qc.invalidateQueries({ queryKey: ["quality_devices"] });
      qc.invalidateQueries({ queryKey: ["quality_device", vars.device_id] });
      toast({ title: "Calibração registrada" });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar", description: e.message, variant: "destructive" }),
  });

  return { ...list, items: list.data ?? [], create };
};

export const useCalibrationCheckpoints = (calibrationId?: string) =>
  useQuery({
    queryKey: ["calibration_checkpoints", calibrationId],
    enabled: !!calibrationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_calibration_checkpoints" as any) as any)
        .select("*").eq("calibration_id", calibrationId!);
      if (error) throw error;
      return (data ?? []) as unknown as CalibrationCheckpoint[];
    },
  });

export const uploadCalibrationFile = async (
  companyId: string,
  deviceId: string,
  file: File,
): Promise<{ url: string; name: string; path: string }> => {
  const sanitized = file.name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${companyId}/${deviceId}/${Date.now()}-${sanitized}`;
  const { error } = await supabase.storage.from("quality-calibrations").upload(path, file, {
    cacheControl: "3600", upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from("quality-calibrations").createSignedUrl(path, 60 * 60 * 24 * 365);
  return { url: data?.signedUrl ?? "", name: file.name, path };
};
