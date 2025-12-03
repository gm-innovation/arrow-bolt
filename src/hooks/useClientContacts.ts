import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export type ClientContactInsert = Omit<ClientContact, "id" | "created_at" | "updated_at">;
export type ClientContactUpdate = Partial<ClientContactInsert>;

export const useClientContacts = (clientId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });

  const createContact = useMutation({
    mutationFn: async (contact: ClientContactInsert) => {
      const { data, error } = await supabase
        .from("client_contacts")
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast({ title: "Contato adicionado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ClientContactUpdate) => {
      const { data, error } = await supabase
        .from("client_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast({ title: "Contato atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("client_contacts")
        .delete()
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast({ title: "Contato removido com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setPrimaryContact = useMutation({
    mutationFn: async (contactId: string) => {
      // First, set all contacts as non-primary
      await supabase
        .from("client_contacts")
        .update({ is_primary: false })
        .eq("client_id", clientId!);

      // Then set the selected one as primary
      const { error } = await supabase
        .from("client_contacts")
        .update({ is_primary: true })
        .eq("id", contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast({ title: "Contato principal definido!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir contato principal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    contacts,
    isLoading,
    createContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  };
};
