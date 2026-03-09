import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientLegalEntity {
  id: string;
  client_id: string;
  legal_name: string;
  cnpj: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientLegalEntities = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ["client-legal-entities", clientId];

  const { data: entities = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_legal_entities")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("legal_name");
      if (error) throw error;
      return data as ClientLegalEntity[];
    },
    enabled: !!clientId,
  });

  const create = useMutation({
    mutationFn: async (entity: { client_id: string; legal_name: string; cnpj?: string; is_primary?: boolean }) => {
      const { data, error } = await supabase
        .from("client_legal_entities")
        .insert(entity as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Razão social adicionada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; legal_name?: string; cnpj?: string; is_primary?: boolean }) => {
      const { error } = await supabase.from("client_legal_entities").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Razão social atualizada!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_legal_entities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Razão social removida!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { entities, isLoading, create, update, remove };
};
