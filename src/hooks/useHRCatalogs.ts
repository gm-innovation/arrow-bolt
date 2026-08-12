import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface HRPosition {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  cbo: string | null;
  level: string | null;
  department_id: string | null;
  requires_driver_license: boolean;
  driver_license_category: string | null;
  requires_certification: boolean;
  active: boolean;
  notes: string | null;
}

export interface HRDepartment {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  code: string | null;
  cost_center: string | null;
  allow_simultaneous_absences: boolean;
  max_simultaneous_absences: number | null;
}

export function useHRPositions(includeInactive = false) {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr-positions", companyId, includeInactive],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("hr_positions")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HRPosition[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useHRDepartments() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr-departments", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, company_id, name, description, code, cost_center, allow_simultaneous_absences, max_simultaneous_absences")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as HRDepartment[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useSavePosition() {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<HRPosition> & { name: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("hr_positions").update(rest as any).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("hr_positions")
        .insert({ ...(payload as any), company_id: profile?.company_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-positions"] });
      toast({ title: "Função salva" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar função", description: e.message, variant: "destructive" }),
  });
}

export function useDeletePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("hr_positions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-positions"] });
      toast({ title: "Função removida" });
    },
    onError: (e: Error) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });
}

export function useSaveDepartmentMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<HRDepartment> & { id: string }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("departments").update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-departments"] });
      toast({ title: "Setor atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar setor", description: e.message, variant: "destructive" }),
  });
}
