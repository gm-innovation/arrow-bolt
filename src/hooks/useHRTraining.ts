import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { parseISO, isBefore, startOfDay } from "date-fns";
import type { MatrixRow } from "./useQualityMatrix";
import type { TrainingPlan, TrainingPlanStatus } from "./useQualityTrainingPlans";

export interface EmployeeTrainingSummary {
  user_id: string;
  full_name: string;
  role: string;
  requirements: number;
  gaps: number;
  mandatoryGaps: number;
  coverage: number;
  openPlans: number;
  latePlans: number;
  completedPlans: number;
  nextDueDate: string | null;
  rows: MatrixRow[];
  plans: TrainingPlan[];
}

const isLate = (p: TrainingPlan) => {
  const ref = p.due_date || p.planned_date;
  if (!ref) return false;
  if (p.status === "completed" || p.status === "cancelled") return false;
  return isBefore(parseISO(ref), startOfDay(new Date()));
};

/** Matriz de competências da empresa (visão RH, somente leitura). */
export const useHRCompetencyMatrix = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr_competency_matrix", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competency_matrix_v" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as MatrixRow[];
    },
  });
};

/** Planos de treinamento da empresa (visão RH). */
export const useHRTrainingPlans = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr_training_plans", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_training_plans" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingPlan[];
    },
  });
};

export const useHRCompetencies = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr_competencies", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competencies" as any)
        .select("id, name, category, is_mandatory")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        name: string;
        category: string;
        is_mandatory: boolean;
      }[];
    },
  });
};

/** Panorama consolidado por colaborador: lacunas + planos. */
export const useHRTrainingOverview = () => {
  const matrix = useHRCompetencyMatrix();
  const plans = useHRTrainingPlans();

  const employees = useMemo<EmployeeTrainingSummary[]>(() => {
    const rows = matrix.data ?? [];
    const allPlans = plans.data ?? [];
    const map = new Map<string, EmployeeTrainingSummary>();

    const ensure = (user_id: string, full_name: string | null, role: string) => {
      let e = map.get(user_id);
      if (!e) {
        e = {
          user_id,
          full_name: full_name || "Sem nome",
          role,
          requirements: 0,
          gaps: 0,
          mandatoryGaps: 0,
          coverage: 100,
          openPlans: 0,
          latePlans: 0,
          completedPlans: 0,
          nextDueDate: null,
          rows: [],
          plans: [],
        };
        map.set(user_id, e);
      }
      return e;
    };

    rows.forEach((r) => {
      const e = ensure(r.user_id, r.full_name, r.role);
      e.rows.push(r);
      e.requirements += 1;
      if (r.gap > 0) {
        e.gaps += 1;
        if (r.is_mandatory) e.mandatoryGaps += 1;
      }
    });

    allPlans.forEach((p) => {
      const e = ensure(p.user_id, null, "");
      e.plans.push(p);
      if (p.status === "completed") e.completedPlans += 1;
      if (p.status === "proposed" || p.status === "in_progress") {
        e.openPlans += 1;
        if (isLate(p)) e.latePlans += 1;
        const ref = p.due_date || p.planned_date;
        if (ref && (!e.nextDueDate || ref < e.nextDueDate)) e.nextDueDate = ref;
      }
    });

    return Array.from(map.values())
      .map((e) => ({
        ...e,
        coverage: e.requirements ? Math.round(((e.requirements - e.gaps) / e.requirements) * 100) : 100,
      }))
      .sort((a, b) => b.gaps - a.gaps || a.full_name.localeCompare(b.full_name));
  }, [matrix.data, plans.data]);

  const kpis = useMemo(() => {
    const allPlans = plans.data ?? [];
    return {
      employees: employees.length,
      employeesWithGaps: employees.filter((e) => e.gaps > 0).length,
      mandatoryGaps: employees.reduce((s, e) => s + e.mandatoryGaps, 0),
      openPlans: allPlans.filter((p) => p.status === "proposed" || p.status === "in_progress").length,
      latePlans: allPlans.filter(isLate).length,
      completedThisYear: allPlans.filter(
        (p) => p.status === "completed" && (p.completed_at || "").startsWith(String(new Date().getFullYear())),
      ).length,
      avgCoverage: employees.length
        ? Math.round(employees.reduce((s, e) => s + e.coverage, 0) / employees.length)
        : 0,
    };
  }, [employees, plans.data]);

  return {
    employees,
    kpis,
    isLoading: matrix.isLoading || plans.isLoading,
    error: matrix.error || plans.error,
  };
};

export const useHRTrainingActions = () => {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["hr_training_plans"] });
    qc.invalidateQueries({ queryKey: ["hr_competency_matrix"] });
    qc.invalidateQueries({ queryKey: ["quality_training_plans"] });
  };

  const generatePlans = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc("quality_generate_training_plans" as any, {
        p_user_id: userId,
      } as any);
      if (error) throw error;
      return (data as unknown as number) ?? 0;
    },
    onSuccess: (count) => {
      invalidate();
      toast({
        title: count ? `${count} plano(s) de capacitação gerado(s)` : "Nenhuma lacuna pendente",
        description: count ? "O colaborador foi notificado." : "Não há lacunas sem plano ativo.",
      });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updatePlan = useMutation({
    mutationFn: async (p: {
      id: string;
      status?: TrainingPlanStatus;
      due_date?: string | null;
      planned_date?: string | null;
      executed_date?: string | null;
      institution?: string | null;
      instructor?: string | null;
      notes?: string | null;
    }) => {
      const { id, ...patch } = p;
      const body: Record<string, any> = { ...patch };
      if (patch.status === "completed") {
        body.completed_at = new Date().toISOString();
        if (!patch.executed_date) body.executed_date = new Date().toISOString().slice(0, 10);
      }
      const { error } = await supabase.from("quality_training_plans" as any).update(body).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Plano atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { generatePlans, updatePlan };
};

export const trainingPlanStatusLabel: Record<TrainingPlanStatus, string> = {
  proposed: "Proposto",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const competencyLevelLabel: Record<string, string> = {
  none: "Nenhum",
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
  expert: "Especialista",
};

export const isPlanLate = isLate;
