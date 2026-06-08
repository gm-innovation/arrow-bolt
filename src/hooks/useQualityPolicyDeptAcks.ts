import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DeptAck {
  department_id: string | null;
  department_name: string;
  total_members: number;
  acknowledged: number;
}

export const useQualityPolicyDeptAcks = (policyVersion: number) => {
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["quality_policy_dept_acks", companyId, policyVersion],
    enabled: !!user && !!companyId,
    queryFn: async () => {
      const [{ data: depts }, { data: members }, { data: acks }, { data: profiles }] = await Promise.all([
        supabase.from("departments" as any).select("id, name").eq("company_id", companyId!).eq("active", true),
        supabase.from("department_members" as any).select("department_id, user_id"),
        supabase.from("quality_policy_acknowledgements" as any).select("user_id")
          .eq("company_id", companyId!).eq("policy_version", policyVersion),
        supabase.from("profiles").select("id").eq("company_id", companyId!),
      ]);

      const allUsers = new Set((profiles ?? []).map((p: any) => p.id));
      const ackSet = new Set((acks ?? []).map((a: any) => a.user_id));
      const deptMembers = new Map<string, Set<string>>();
      const memberDept = new Map<string, string>();
      (members ?? []).forEach((m: any) => {
        if (!deptMembers.has(m.department_id)) deptMembers.set(m.department_id, new Set());
        deptMembers.get(m.department_id)!.add(m.user_id);
        memberDept.set(m.user_id, m.department_id);
      });

      const rows: DeptAck[] = (depts ?? []).map((d: any) => {
        const memberIds = Array.from(deptMembers.get(d.id) ?? []);
        const acknowledged = memberIds.filter((u) => ackSet.has(u)).length;
        return {
          department_id: d.id,
          department_name: d.name,
          total_members: memberIds.length,
          acknowledged,
        };
      });

      const unassigned = Array.from(allUsers).filter((u) => !memberDept.has(u));
      if (unassigned.length > 0) {
        rows.push({
          department_id: null,
          department_name: "Sem departamento",
          total_members: unassigned.length,
          acknowledged: unassigned.filter((u) => ackSet.has(u)).length,
        });
      }

      return rows.sort((a, b) => a.department_name.localeCompare(b.department_name));
    },
  });
};
