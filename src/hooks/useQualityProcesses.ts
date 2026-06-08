import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityProcess {
  id: string;
  company_id: string;
  name: string;
  type: "strategic" | "tactical" | "operational" | "support";
  description: string | null;
  status: "draft" | "active" | "obsolete";
  owner_user_id: string | null;
  current_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessSIPOC {
  id: string;
  process_id: string;
  suppliers: string | null;
  inputs: string | null;
  activities: string | null;
  outputs: string | null;
  customers: string | null;
}

export interface ProcessActivity {
  id: string;
  process_id: string;
  order_index: number;
  activity: string;
  responsible_user_id: string | null;
  indicators: string | null;
}

export const useQualityProcesses = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["quality_processes", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_processes" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("name");
      if (error) throw error;
      return (data as unknown) as QualityProcess[];
    },
  });

  const upsertProcess = useMutation({
    mutationFn: async (p: Partial<QualityProcess> & { name: string }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = { ...p, company_id: profile.company_id };
      if (!p.id) payload.created_by = user!.id;
      const { data, error } = p.id
        ? await supabase.from("quality_processes" as any).update(payload).eq("id", p.id).select().maybeSingle()
        : await supabase.from("quality_processes" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_processes"] });
      toast({ title: "Processo salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeProcess = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_processes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_processes"] }),
  });

  return { processes, isLoading, upsertProcess, removeProcess };
};

export const useProcessSIPOC = (processId: string | null) => {
  const qc = useQueryClient();
  const { data: sipoc } = useQuery({
    queryKey: ["quality_process_sipoc", processId],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_process_sipoc" as any)
        .select("*")
        .eq("process_id", processId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as ProcessSIPOC | null;
    },
  });

  const save = useMutation({
    mutationFn: async (s: Partial<ProcessSIPOC>) => {
      if (!processId) throw new Error("processId obrigatório");
      const payload: any = { ...s, process_id: processId };
      const { error } = await supabase.from("quality_process_sipoc" as any).upsert(payload, { onConflict: "process_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_process_sipoc", processId] });
      toast({ title: "SIPOC salvo" });
    },
  });

  return { sipoc, save };
};

export const useProcessActivities = (processId: string | null) => {
  const qc = useQueryClient();
  const { data: activities = [] } = useQuery({
    queryKey: ["quality_process_activities", processId],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_process_activities" as any)
        .select("*")
        .eq("process_id", processId!)
        .order("order_index");
      if (error) throw error;
      return (data as unknown) as ProcessActivity[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (a: Partial<ProcessActivity> & { activity: string }) => {
      if (!processId) throw new Error("processId obrigatório");
      const payload: any = { ...a, process_id: processId };
      const { error } = a.id
        ? await supabase.from("quality_process_activities" as any).update(payload).eq("id", a.id)
        : await supabase.from("quality_process_activities" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_process_activities", processId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_process_activities" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_process_activities", processId] }),
  });

  return { activities, upsert, remove };
};
