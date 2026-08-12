import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanyUser {
  id: string;
  full_name: string | null;
}

/**
 * Lists users from the current company, optionally filtered by roles.
 * Uses the safe `profiles_public` view (no PII) so every role — including
 * commercial — can resolve colleague names without reading `profiles`.
 */
export const useCompanyUsers = (roles?: string[]) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["company-users", profile?.company_id, roles?.join(",")],
    queryFn: async (): Promise<CompanyUser[]> => {
      if (!profile?.company_id) return [];

      const { data: profilesData, error: pErr } = await supabase
        .from("profiles_public")
        .select("id, full_name")
        .eq("company_id", profile.company_id)
        .order("full_name");
      if (pErr) throw pErr;

      const list = (profilesData || []).map((p: any) => ({ id: p.id, full_name: p.full_name }));

      if (!roles || roles.length === 0) return list;

      const { data: rolesData, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", roles as any);
      if (rErr) throw rErr;

      const allowed = new Set((rolesData || []).map((r: any) => r.user_id));
      return list.filter((p) => allowed.has(p.id));
    },
    enabled: !!profile?.company_id,
    staleTime: 1000 * 60 * 5,
  });
};
