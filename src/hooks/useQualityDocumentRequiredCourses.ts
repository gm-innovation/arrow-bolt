import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface DocumentRequiredCourse {
  id: string;
  company_id: string;
  document_id: string;
  course_id: string | null;
  trail_id: string | null;
  is_mandatory: boolean;
  notes: string | null;
  created_at: string;
}

export interface MissingPrerequisite {
  required_id: string;
  kind: "course" | "trail";
  ref_id: string;
  label: string;
}

export const useQualityDocumentRequiredCourses = (documentId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_document_required_courses", documentId ?? "all", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("quality_document_required_courses" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (documentId) q = q.eq("document_id", documentId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DocumentRequiredCourse[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: { document_id: string; course_id?: string | null; trail_id?: string | null; is_mandatory?: boolean; notes?: string | null; }) => {
      const payload: any = {
        company_id: companyId,
        document_id: input.document_id,
        course_id: input.course_id ?? null,
        trail_id: input.trail_id ?? null,
        is_mandatory: input.is_mandatory ?? true,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("quality_document_required_courses" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document_required_courses"] });
      toast({ title: "Pré-requisito adicionado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_document_required_courses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_document_required_courses"] }),
  });

  return { ...list, items: list.data ?? [], add, remove };
};

export const useMyMissingPrerequisites = (documentId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_missing_prerequisites", documentId, user?.id],
    enabled: !!documentId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("quality_user_missing_prerequisites" as any, {
        p_user_id: user!.id,
        p_document_id: documentId!,
      } as any);
      if (error) throw error;
      return (data ?? []) as unknown as MissingPrerequisite[];
    },
  });
};
