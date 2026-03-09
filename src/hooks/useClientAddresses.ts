import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientAddress {
  id: string;
  client_id: string;
  label: string | null;
  cep: string | null;
  street: string | null;
  street_number: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const useClientAddresses = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ["client-addresses", clientId];

  const { data: addresses = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_addresses")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("label");
      if (error) throw error;
      return data as ClientAddress[];
    },
    enabled: !!clientId,
  });

  const create = useMutation({
    mutationFn: async (addr: Partial<ClientAddress> & { client_id: string }) => {
      const { data, error } = await supabase
        .from("client_addresses")
        .insert(addr as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Endereço adicionado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ClientAddress>) => {
      const { error } = await supabase.from("client_addresses").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Endereço atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Endereço removido!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { addresses, isLoading, create, update, remove };
};
