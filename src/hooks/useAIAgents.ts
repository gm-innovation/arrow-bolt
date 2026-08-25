import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AIAgentVoice = string;

/** Motores de síntese de voz suportados pela função ai-text-to-speech. */
export type AIVoiceEngine = "gemini" | "openai" | "elevenlabs";

export const AI_VOICE_ENGINE_LABELS: Record<AIVoiceEngine, string> = {
  gemini: "Gemini TTS (Lovable AI)",
  openai: "OpenAI TTS (motor atual)",
  elevenlabs: "ElevenLabs",
};

export const AI_VOICE_OPTIONS_BY_ENGINE: Record<AIVoiceEngine, { value: string; label: string }[]> = {
  gemini: [
    { value: "Kore", label: "Kore (feminina, firme)" },
    { value: "Leda", label: "Leda (feminina, jovem)" },
    { value: "Aoede", label: "Aoede (feminina, leve)" },
    { value: "Zephyr", label: "Zephyr (feminina, clara)" },
    { value: "Puck", label: "Puck (masculina, animada)" },
    { value: "Charon", label: "Charon (masculina, grave)" },
  ],
  openai: [
    { value: "coral", label: "Coral (feminina, expressiva)" },
    { value: "shimmer", label: "Shimmer (feminina, suave)" },
    { value: "sage", label: "Sage (feminina, calma)" },
    { value: "nova", label: "Nova (feminina, jovem)" },
    { value: "alloy", label: "Alloy (neutra)" },
    { value: "echo", label: "Echo (masculina)" },
  ],
  elevenlabs: [
    { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (feminina, natural)" },
    { value: "FGY2WhTYpPnrIDTdsKH5", label: "Laura (feminina, jovem)" },
    { value: "XrExE9yKIg1WjnnlVkGX", label: "Matilda (feminina, calorosa)" },
    { value: "cgSgspJ2msm6clMCkdW9", label: "Jessica (feminina, expressiva)" },
    { value: "pFZP5JQG7iQjIQuC4Bku", label: "Lily (feminina, suave)" },
    { value: "onwK4e9ZLuTAKqWW03F9", label: "Daniel (masculina)" },
  ],
};

/** Vozes padrão por motor, usadas quando o agente não define uma. */
export const AI_VOICE_ENGINE_DEFAULTS: Record<AIVoiceEngine, string> = {
  gemini: "Kore",
  openai: "coral",
  elevenlabs: "EXAVITQu4vr4xnSDxMaL",
};

/** Compatibilidade: lista antiga usada pela aba Identidade. */
export const AI_VOICE_OPTIONS = AI_VOICE_OPTIONS_BY_ENGINE.openai;

export const DEFAULT_VOICE_INSTRUCTIONS =
  "Fale em português do Brasil como uma colega de trabalho experiente conversando, não como locutora. " +
  "Entonação variada, pausas naturais em vírgulas e pontos, ritmo de fala real. " +
  "Diga números e siglas como um brasileiro falaria. Não leia símbolos de formatação.";

export type AIAgentIdentity = {
  name?: string;
  tagline?: string;
  welcome_message?: string;
  tone?: "formal" | "amigavel" | "tecnico" | "descontraido" | "neutro";
  language?: string;
  persona?: string;
  avatar_url?: string;
  voice_engine?: AIVoiceEngine;
  voice?: AIAgentVoice;
  voice_speed?: number;
  voice_instructions?: string;
};


export type AIAgentOutOfScopeArea = {
  area_key: string;
  label: string;
  department_name?: string;
  request_type_name?: string;
  keywords: string[];
  default_priority?: "low" | "medium" | "high" | "critical";
  enabled: boolean;
};

export type AIAgentOutOfScope = {
  enabled: boolean;
  policy: "explain_and_offer" | "explain_only" | "refuse" | "off";
  channel: "corp_request" | "support_ticket" | "both";
  explain_template: string;
  offer_template: string;
  confirmation_template: string;
  refusal_template: string;
  area_routing: AIAgentOutOfScopeArea[];
};

export type AIAgentAgility = {
  level?: "normal" | "agil" | "ultra";
  default_proactivity?: "low" | "medium" | "high";
  use_name?: boolean;
  allow_learning?: boolean;
};

export type AIAgentBehavior = {
  suggested_prompts?: string[];
  role_instructions?: Record<string, string>;
  auto_flows?: Record<string, boolean>;
  memory_size?: number;
  handoff_channel?: string;
  handoff_target?: string;
  out_of_scope?: AIAgentOutOfScope;
  agility?: AIAgentAgility;
  naturalness?: "mechanical" | "natural" | "conversational";
  use_emojis?: boolean;
  avoid_repetitive_openings?: boolean;
  single_message_collection?: boolean;
  require_roadmap_description?: boolean;
};

export const DEFAULT_OUT_OF_SCOPE: AIAgentOutOfScope = {
  enabled: true,
  policy: "explain_and_offer",
  channel: "corp_request",
  explain_template:
    "Isso é tratado pelo setor de {{area}}. Em resumo: {{summary}}.",
  offer_template:
    "Quer que eu abra uma solicitação para o {{area}} em seu nome?",
  confirmation_template:
    "Solicitação #{{ticket_number}} enviada ao {{area}}. Você acompanha em Corporativo → Minhas Solicitações.",
  refusal_template:
    "Esse assunto é do setor de {{area}} e está fora do seu perfil de acesso. Recomendo falar diretamente com o responsável.",
  area_routing: [
    { area_key: "rh", label: "RH", department_name: "RH", keywords: ["férias", "folga", "atestado", "exame", "ponto", "benefício", "salário", "admissão", "demissão"], default_priority: "medium", enabled: true },
    { area_key: "financeiro", label: "Financeiro", department_name: "Financeiro", keywords: ["pagamento", "boleto", "nota fiscal", "reembolso", "conta", "fluxo de caixa"], default_priority: "medium", enabled: true },
    { area_key: "suprimentos", label: "Suprimentos", department_name: "Suprimentos", keywords: ["compra", "material", "cotação", "fornecedor", "requisição"], default_priority: "medium", enabled: true },
    { area_key: "qualidade", label: "Qualidade", department_name: "Qualidade", keywords: ["ncr", "auditoria", "iso", "indicador", "documento controlado", "não conformidade"], default_priority: "medium", enabled: true },
    { area_key: "comercial", label: "Comercial", department_name: "Comercial", keywords: ["lead", "oportunidade", "cliente", "venda", "contrato", "proposta"], default_priority: "medium", enabled: true },
    { area_key: "marketing", label: "Marketing", department_name: "Marketing", keywords: ["divulgação", "campanha", "site", "redes sociais", "material de marketing"], default_priority: "medium", enabled: true },
    { area_key: "coordenacao", label: "Coordenação", department_name: "Operacional", keywords: ["escala", "os", "ordem de serviço", "medição", "agendamento", "técnico"], default_priority: "medium", enabled: true },
    { area_key: "diretoria", label: "Diretoria", department_name: "Diretoria", keywords: ["aprovação estratégica", "orçamento anual", "contratação executiva"], default_priority: "high", enabled: true },
  ],
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
  provider?: "lovable" | "openrouter";
  model?: string;
  image_model?: string;
  temperature?: number;
  max_tokens?: number;
  enabled_tools?: string[];
  rag_context?: string;
  openrouter_route?: "" | "price" | "throughput" | "latency";
  openrouter_providers?: string[];
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

export type AIAgentWriteAction = { create?: boolean; update?: boolean; delete?: boolean };

export type AIAgentScope = {
  roles?: string[];
  routes?: string[];
  write_actions?: Record<string, AIAgentWriteAction>;
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
