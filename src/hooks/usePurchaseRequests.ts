import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface PurchaseRequest {
  id: string;
  company_id: string;
  requester_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  estimated_total: number;
  justification: string | null;
  manager_approver_id: string | null;
  manager_approved_at: string | null;
  director_approver_id: string | null;
  director_approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string } | null;
  items?: PurchaseRequestItem[];
}

export interface PurchaseRequestItem {
  id: string;
  request_id: string;
  description: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  notes: string | null;
  created_at: string;
}

export const usePurchaseRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["purchase-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_requests")
        .select("*, requester:profiles!purchase_requests_requester_id_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as PurchaseRequest[];
    },
    enabled: !!user,
  });

  const createRequest = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      category: string;
      priority: string;
      justification?: string;
      items: { description: string; quantity: number; unit: string; estimated_unit_price: number; notes?: string }[];
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data: request, error: reqError } = await supabase
        .from("purchase_requests")
        .insert({
          company_id: profile.company_id,
          requester_id: user!.id,
          title: values.title,
          description: values.description || null,
          category: values.category,
          priority: values.priority,
          justification: values.justification || null,
          status: "pending_manager",
        })
        .select()
        .single();

      if (reqError) throw reqError;

      if (values.items.length > 0) {
        const { error: itemsError } = await supabase
          .from("purchase_request_items")
          .insert(
            values.items.map((item) => ({
              request_id: request.id,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              estimated_unit_price: item.estimated_unit_price,
              notes: item.notes || null,
            }))
          );
        if (itemsError) throw itemsError;
      }

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast({ title: "Solicitação criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar solicitação", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const updates: Record<string, unknown> = { status };

      if (status === "rejected" && rejection_reason) {
        updates.rejection_reason = rejection_reason;
      }
      if (status === "approved" || status === "pending_director") {
        updates.manager_approver_id = user!.id;
        updates.manager_approved_at = new Date().toISOString();
      }
      if (status === "approved" && updates.manager_approver_id) {
        // If going directly to approved from pending_director
        updates.director_approver_id = user!.id;
        updates.director_approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("purchase_requests")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast({ title: "Status atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("purchase_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      toast({ title: "Solicitação excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  return {
    requests,
    isLoading,
    createRequest,
    updateStatus,
    deleteRequest,
  };
};

export const usePurchaseRequestItems = (requestId: string | null) => {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["purchase-request-items", requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_request_items")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at");

      if (error) throw error;
      return data as unknown as PurchaseRequestItem[];
    },
    enabled: !!requestId,
  });

  return { items, isLoading };
};
