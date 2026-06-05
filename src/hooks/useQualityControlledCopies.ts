import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ControlledCopyStatus = "issued" | "returned" | "destroyed" | "lost" | "superseded";

export interface QualityControlledCopy {
  id: string;
  document_id: string;
  version_id: string;
  copy_number: number;
  recipient_user_id: string | null;
  recipient_name: string | null;
  recipient_location: string | null;
  issued_by: string | null;
  issued_at: string;
  returned_at: string | null;
  destroyed_at: string | null;
  status: ControlledCopyStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityControlledCopies = (documentId?: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: copies = [], isLoading } = useQuery({
    queryKey: ["quality_controlled_copies", documentId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("quality_controlled_copies")
        .select(
          "*, document:quality_documents(id, code, title), recipient:profiles!quality_controlled_copies_recipient_user_id_fkey(id, full_name)"
        )
        .order("issued_at", { ascending: false });
      if (documentId) q = q.eq("document_id", documentId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const issue = useMutation({
    mutationFn: async (input: {
      document_id: string;
      version_id: string;
      recipient_user_id?: string | null;
      recipient_name?: string | null;
      recipient_location?: string | null;
      notes?: string | null;
    }) => {
      const { data: last } = await supabase
        .from("quality_controlled_copies")
        .select("copy_number")
        .eq("document_id", input.document_id)
        .order("copy_number", { ascending: false })
        .limit(1);
      const nextNumber = (last?.[0]?.copy_number ?? 0) + 1;
      const { data, error } = await supabase
        .from("quality_controlled_copies")
        .insert({
          ...input,
          copy_number: nextNumber,
          issued_by: user!.id,
          status: "issued",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_controlled_copies"] });
      toast({ title: "Cópia controlada registrada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao registrar cópia", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: ControlledCopyStatus;
      notes?: string;
    }) => {
      const now = new Date().toISOString();
      const patch: any = { status };
      if (status === "returned") patch.returned_at = now;
      if (status === "destroyed") patch.destroyed_at = now;
      if (notes) patch.notes = notes;
      const { error } = await supabase.from("quality_controlled_copies").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_controlled_copies"] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { copies, isLoading, issue, updateStatus };
};
