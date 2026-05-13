import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lists users from the current company, optionally filtered by roles.
 * Uses profiles + user_roles (avoids exposing PII via the public profile view since
 * commercial / admin users are allowed to read profiles in their own company).
 */
export const useCompanyUsers = (roles?: string[]) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["company-users", profile?.company_id, roles?.join(",")],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data: profilesData, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("company_id", profile.company_id)
        .order("full_name");
      if (pErr) throw pErr;

      if (!roles || roles.length === 0) {
        return (profilesData || []).map((p: any) => ({ id: p.id, full_name: p.full_name, email: p.email }));
      }

      const { data: rolesData, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", roles as any);
      if (rErr) throw rErr;

      const allowed = new Set((rolesData || []).map((r: any) => r.user_id));
      return (profilesData || [])
        .filter((p: any) => allowed.has(p.id))
        .map((p: any) => ({ id: p.id, full_name: p.full_name, email: p.email }));
    },
    enabled: !!profile?.company_id,
    staleTime: 1000 * 60 * 5,
  });
};
