import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface EmployeeNote {
  id: string;
  company_id: string;
  employee_user_id: string;
  author_id: string;
  note_type: string;
  title: string;
  content: string;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
  author?: { full_name: string };
}

export function useEmployeeNotes(employeeUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["employee-notes", employeeUserId],
    enabled: !!employeeUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_notes" as any)
        .select("*, author:profiles!employee_notes_author_id_fkey(full_name)")
        .eq("employee_user_id", employeeUserId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EmployeeNote[];
    },
  });

  const createNote = useMutation({
    mutationFn: async (note: {
      employee_user_id: string;
      company_id: string;
      note_type: string;
      title: string;
      content: string;
      is_confidential: boolean;
    }) => {
      const { error } = await supabase
        .from("employee_notes" as any)
        .insert({ ...note, author_id: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes", employeeUserId] });
      toast({ title: "Anotação criada com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar anotação", variant: "destructive" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from("employee_notes" as any)
        .delete()
        .eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-notes", employeeUserId] });
      toast({ title: "Anotação removida" });
    },
    onError: () => {
      toast({ title: "Erro ao remover anotação", variant: "destructive" });
    },
  });

  return { notes: notesQuery.data ?? [], isLoading: notesQuery.isLoading, createNote, deleteNote };
}
