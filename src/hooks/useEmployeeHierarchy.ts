import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface HierarchyRow {
  id: string;
  full_name: string;
  email: string;
  direct_manager_id: string | null;
  position: string | null;
  role: string | null;
  department_id: string | null;
  department_name: string | null;
}

export const useEmployeeHierarchy = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["employee-hierarchy", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async (): Promise<HierarchyRow[]> => {
      const { data: profiles, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, direct_manager_id, position")
        .eq("company_id", profile!.company_id)
        .order("full_name");
      if (error) throw error;

      const ids = (profiles ?? []).map((p) => p.id);
      if (ids.length === 0) return [];

      const [{ data: roles }, { data: members }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        (supabase as any)
          .from("department_members")
          .select("user_id, department:departments(id, name)")
          .in("user_id", ids),
      ]);

      const roleMap = new Map<string, string>();
      (roles ?? []).forEach((r: any) => {
        if (!roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
      });
      const deptMap = new Map<string, { id: string; name: string }>();
      (members ?? []).forEach((m: any) => {
        if (m.department) deptMap.set(m.user_id, m.department);
      });

      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name ?? "",
        email: p.email ?? "",
        direct_manager_id: p.direct_manager_id ?? null,
        position: p.position ?? null,
        role: roleMap.get(p.id) ?? null,
        department_id: deptMap.get(p.id)?.id ?? null,
        department_name: deptMap.get(p.id)?.name ?? null,
      }));
    },
  });

  const updateManager = useMutation({
    mutationFn: async ({ employeeId, managerId }: { employeeId: string; managerId: string | null }) => {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ direct_manager_id: managerId })
        .eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gestor atualizado");
      qc.invalidateQueries({ queryKey: ["employee-hierarchy"] });
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar gestor", { description: err.message });
    },
  });

  return { ...query, updateManager };
};
