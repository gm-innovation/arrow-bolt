import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AIVerbosity = "concise" | "balanced" | "detailed";
export type AITone = "formal" | "neutral" | "informal";
export type AIProactivity = "low" | "medium" | "high";

export type AIUserVoice = "coral" | "shimmer" | "sage" | "nova" | "alloy" | "echo";

export const AI_USER_VOICE_LABELS: Record<AIUserVoice, string> = {
  coral: "Coral (feminina, expressiva)",
  shimmer: "Shimmer (feminina, suave)",
  sage: "Sage (feminina, calma)",
  nova: "Nova (feminina, jovem)",
  alloy: "Alloy (neutra)",
  echo: "Echo (masculina)",
};

export type AILearnedNote = { note: string; at?: string };

export interface AIUserPreferences {
  user_id: string;
  company_id: string | null;
  preferred_name: string | null;
  verbosity: AIVerbosity;
  tone: AITone;
  proactivity: AIProactivity;
  use_name: boolean;
  learned_notes: AILearnedNote[];
  voice: AIUserVoice | null;
  voice_speed: number | null;
}

export const VERBOSITY_LABELS: Record<AIVerbosity, string> = {
  concise: "Concisa",
  balanced: "Equilibrada",
  detailed: "Detalhada",
};

export const TONE_LABELS: Record<AITone, string> = {
  formal: "Formal",
  neutral: "Neutro",
  informal: "Informal",
};

export const PROACTIVITY_LABELS: Record<AIProactivity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const DEFAULT_AI_PREFERENCES: Omit<AIUserPreferences, "user_id" | "company_id"> = {
  preferred_name: null,
  verbosity: "concise",
  tone: "neutral",
  proactivity: "medium",
  use_name: true,
  learned_notes: [],
  voice: null,
  voice_speed: null,
};

export function useAIUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-user-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AIUserPreferences> => {
      const { data, error } = await supabase
        .from("ai_user_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return { user_id: user!.id, company_id: null, ...DEFAULT_AI_PREFERENCES };
      }
      const row = data as any;
      return {
        user_id: row.user_id,
        company_id: row.company_id ?? null,
        preferred_name: row.preferred_name ?? null,
        verbosity: (row.verbosity ?? "concise") as AIVerbosity,
        tone: (row.tone ?? "neutral") as AITone,
        proactivity: (row.proactivity ?? "medium") as AIProactivity,
        use_name: row.use_name ?? true,
        learned_notes: Array.isArray(row.learned_notes) ? row.learned_notes : [],
        voice: (row.voice ?? null) as AIUserVoice | null,
        voice_speed: row.voice_speed != null ? Number(row.voice_speed) : null,
      };
    },
  });
}

export function useUpdateAIUserPreferences() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<AIUserPreferences, "user_id">>) => {
      if (!user?.id) throw new Error("Sessão inválida");
      const { error } = await supabase.from("ai_user_preferences" as any).upsert(
        {
          user_id: user.id,
          company_id: (profile as any)?.company_id ?? null,
          ...patch,
        } as any,
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-user-preferences"] });
      toast.success("Preferências do assistente atualizadas");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar preferências"),
  });
}
