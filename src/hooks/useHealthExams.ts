import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type HealthExamType =
  | "admissional"
  | "periodico"
  | "mudanca_funcao"
  | "retorno_trabalho"
  | "demissional";

export type HealthExamResult =
  | "apto"
  | "apto_com_restricao"
  | "inapto"
  | "pendente";

export interface HealthExam {
  id: string;
  employee_id: string;
  exam_type: HealthExamType;
  exam_date: string;
  next_exam_date: string | null;
  clinic_name: string | null;
  doctor_name: string | null;
  doctor_crm: string | null;
  result: HealthExamResult;
  restrictions: string | null;
  observations: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; full_name: string | null; avatar_url: string | null; position: string | null };
}

export interface HealthExamSetting {
  id: string;
  exam_type: HealthExamType;
  periodicity_months: number;
  alert_days_before: number;
  description: string | null;
}

export const examTypeLabel: Record<HealthExamType, string> = {
  admissional: "Admissional",
  periodico: "Periódico",
  mudanca_funcao: "Mudança de Função",
  retorno_trabalho: "Retorno ao Trabalho",
  demissional: "Demissional",
};

export const examResultLabel: Record<HealthExamResult, string> = {
  apto: "Apto",
  apto_com_restricao: "Apto com Restrição",
  inapto: "Inapto",
  pendente: "Pendente",
};

export const examResultVariant: Record<HealthExamResult, "default" | "secondary" | "destructive" | "outline"> = {
  apto: "default",
  apto_com_restricao: "secondary",
  inapto: "destructive",
  pendente: "outline",
};

export type ExamStatus = "valid" | "expiring" | "expired" | "no_date";

export function getExamStatus(nextDate: string | null, alertDaysBefore = 60): ExamStatus {
  if (!nextDate) return "no_date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextDate + "T00:00:00");
  const diff = Math.floor((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "expired";
  if (diff <= alertDaysBefore) return "expiring";
  return "valid";
}

export function useHealthExams(employeeId?: string) {
  return useQuery({
    queryKey: ["health-exams", employeeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("hr_health_exams")
        .select(
          `*, employee:profiles!hr_health_exams_employee_id_fkey(id, full_name, avatar_url, position)`
        )
        .order("exam_date", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as HealthExam[];
    },
  });
}

export function useHealthExamSettings() {
  return useQuery({
    queryKey: ["health-exam-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_health_exam_settings")
        .select("*")
        .order("exam_type");
      if (error) throw error;
      return (data ?? []) as HealthExamSetting[];
    },
  });
}

export interface UpsertExamInput {
  id?: string;
  employee_id: string;
  exam_type: HealthExamType;
  exam_date: string;
  next_exam_date?: string | null;
  clinic_name?: string | null;
  doctor_name?: string | null;
  doctor_crm?: string | null;
  result: HealthExamResult;
  restrictions?: string | null;
  observations?: string | null;
  file?: File | null;
}

export function useUpsertHealthExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertExamInput) => {
      const { file, id, ...payload } = input;

      let attachment_path: string | undefined;
      let attachment_name: string | undefined;

      if (file) {
        const cleanName = file.name.replace(/[^\w.\-]/g, "_");
        const path = `${input.employee_id}/${Date.now()}_${cleanName}`;
        const { error: upErr } = await supabase.storage
          .from("hr-health-exams")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        attachment_path = path;
        attachment_name = file.name;
      }

      const body: Record<string, unknown> = { ...payload };
      if (attachment_path) {
        body.attachment_path = attachment_path;
        body.attachment_name = attachment_name;
      }

      if (id) {
        const { error } = await supabase.from("hr_health_exams").update(body).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data: userData } = await supabase.auth.getUser();
      body.created_by = userData.user?.id;
      const { data, error } = await supabase
        .from("hr_health_exams")
        .insert(body as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-exams"] });
      toast.success("Exame salvo com sucesso");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao salvar exame"),
  });
}

export function useDeleteHealthExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: row } = await supabase
        .from("hr_health_exams")
        .select("attachment_path")
        .eq("id", id)
        .maybeSingle();
      if (row?.attachment_path) {
        await supabase.storage.from("hr-health-exams").remove([row.attachment_path]);
      }
      const { error } = await supabase.from("hr_health_exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health-exams"] });
      toast.success("Exame removido");
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao remover"),
  });
}

export async function downloadHealthExamAttachment(path: string, filename: string) {
  const { data, error } = await supabase.storage
    .from("hr-health-exams")
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    toast.error("Não foi possível gerar link do anexo");
    return;
  }
  const a = document.createElement("a");
  a.href = data.signedUrl;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
