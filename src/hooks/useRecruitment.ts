import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useJobOpenings = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: openings = [], isLoading } = useQuery({
    queryKey: ["job-openings", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_openings")
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const upsertOpening = useMutation({
    mutationFn: async (o: any) => {
      const payload = { ...o, company_id: profile!.company_id, created_by: profile!.id };
      if (o.id) {
        const { error } = await (supabase as any).from("job_openings").update(o).eq("id", o.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("job_openings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-openings"] });
      toast({ title: "Vaga salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteOpening = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("job_openings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-openings"] });
      toast({ title: "Vaga removida" });
    },
  });

  return { openings, isLoading, upsertOpening, deleteOpening };
};

export const useJobApplications = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["job-applications", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_applications")
        .select("*, job_opening:job_openings(id, title, area)")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const { error } = await (supabase as any)
        .from("job_applications")
        .update({ ...patch, reviewed_by: profile!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Candidatura atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("job_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast({ title: "Candidatura removida" });
    },
  });

  return { applications, isLoading, updateApplication, deleteApplication };
};

export const useApplicationNotes = (applicationId?: string) => {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["job-application-notes", applicationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("job_application_notes")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!applicationId,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      const { error } = await (supabase as any)
        .from("job_application_notes")
        .insert({ application_id: applicationId, author_id: profile!.id, note });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-application-notes", applicationId] }),
  });

  return { notes, isLoading, addNote };
};

export const downloadCv = async (path: string, fileName: string) => {
  const { data, error } = await supabase.storage.from("recruitment-cvs").download(path);
  if (error) {
    toast({ title: "Erro ao baixar CV", description: error.message, variant: "destructive" });
    return;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const getCvSignedUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("recruitment-cvs")
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
};
