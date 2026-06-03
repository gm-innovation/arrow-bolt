import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AIAgentIdentity = {
  name?: string;
  tagline?: string;
  welcome_message?: string;
  tone?: "formal" | "amigavel" | "tecnico" | "descontraido" | "neutro";
  language?: string;
  persona?: string;
  avatar_url?: string;
};

export type AIAgentBehavior = {
  suggested_prompts?: string[];
  role_instructions?: Record<string, string>;
  auto_flows?: Record<string, boolean>;
  memory_size?: number;
  handoff_channel?: string;
  handoff_target?: string;
};

export type AIAgentGuardrails = {
  forbidden_topics?: string[];
  allowed_topics?: string[];
  pii_filter?: boolean;
  block_offensive?: boolean;
  blocked_message?: string;
  daily_limit?: number;
  max_tokens?: number;
  disclaimer?: string;
  approval_mode?: boolean;
};

export type AIAgentToolsModel = {
  model?: string;
  image_model?: string;
  temperature?: number;
  max_tokens?: number;
  enabled_tools?: string[];
  rag_context?: string;
};

export type AIAgentAppearance = {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  primary_color?: string;
  header_color?: string;
  size?: "small" | "medium" | "large";
  shape?: "circle" | "rounded" | "pill";
  icon?: string;
  badge?: boolean;
  animation?: "fade" | "slide-up" | "bounce" | "none";
  theme?: "light" | "dark" | "auto";
  visible_roles?: string[];
  hidden_routes?: string[];
};

export type AIAgentScope = {
  roles?: string[];
  routes?: string[];
};

export type AIAgent = {
  id: string;
  company_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_default: boolean;
  enabled: boolean;
  identity: AIAgentIdentity;
  behavior: AIAgentBehavior;
  guardrails: AIAgentGuardrails;
  tools_model: AIAgentToolsModel;
  appearance: AIAgentAppearance;
  scope: AIAgentScope;
  created_at: string;
  updated_at: string;
};

export function useAIAgents(companyId?: string | null) {
  return useQuery({
    queryKey: ["ai-agents", companyId ?? "global"],
    queryFn: async () => {
      let q = supabase.from("ai_agents" as any).select("*").order("created_at", { ascending: true });
      if (companyId === undefined) {
        // todos
      } else if (companyId === null) {
        q = q.is("company_id", null);
      } else {
        q = q.eq("company_id", companyId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) as AIAgent[];
    },
  });
}

export function useUpdateAIAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AIAgent> & { id: string }) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase
        .from("ai_agents" as any)
        .update(rest as any)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useCreateAIAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AIAgent>) => {
      const { data, error } = await supabase
        .from("ai_agents" as any)
        .insert(payload as any)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao criar"),
  });
}

export function useDeleteAIAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_agents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}
