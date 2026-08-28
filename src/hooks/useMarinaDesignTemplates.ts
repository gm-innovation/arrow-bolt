import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DesignSpec } from "@/lib/marina/designTemplates";

export interface MarinaDesignTemplate {
  id: string;
  name: string;
  payload: DesignSpec;
  created_at: string;
}

/** "Meus modelos": pedidos de design salvos pela própria pessoa. */
export function useMarinaDesignTemplates() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marina-design-templates", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MarinaDesignTemplate[]> => {
      const { data, error } = await supabase
        .from("marina_design_templates")
        .select("id, name, payload, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        payload: (t.payload ?? {}) as DesignSpec,
        created_at: t.created_at,
      }));
    },
  });
}

export function useSaveDesignTemplate() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: { name: string; spec: DesignSpec }) => {
      const row = {
        user_id: user!.id,
        ...((profile as any)?.company_id ? { company_id: (profile as any).company_id as string } : {}),
        name: payload.name,
        payload: payload.spec as unknown as Record<string, unknown>,
      };
      const { error } = await supabase.from("marina_design_templates").insert([row] as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-design-templates"] }),
  });
}

export function useDeleteDesignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marina_design_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-design-templates"] }),
  });
}
