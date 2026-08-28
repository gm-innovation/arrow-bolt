import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/marina-chat`;

/** Categorias da biblioteca de referências da Lecsor. */
export const ASSET_CATEGORIES = [
  { value: "embarcacoes", label: "Embarcações" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "equipe_epi", label: "Equipe / EPI" },
  { value: "marca", label: "Marca (logo)" },
  { value: "ambientes", label: "Ambientes / bordo" },
  { value: "clientes", label: "Clientes" },
  { value: "outros", label: "Outros" },
] as const;

export function categoryLabel(value: string) {
  return ASSET_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export interface MarinaDesignAsset {
  id: string;
  category: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  storage_path: string;
  is_default: boolean;
  created_at: string;
  /** URL assinada de 1h para exibir e usar como referência. */
  file_url: string | null;
}

async function callAssets(action: string, init?: { method?: string; body?: unknown }) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}?action=${action}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível concluir a ação.");
  return json;
}

/** Biblioteca de assets da empresa. */
export function useMarinaDesignAssets(enabled = true) {
  return useQuery({
    queryKey: ["marina-design-assets"],
    enabled,
    queryFn: async () => ((await callAssets("assets")) as { assets: MarinaDesignAsset[] }).assets ?? [],
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["marina-design-assets"] });
}

export function useSaveDesignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      category: string;
      name: string;
      description?: string;
      tags?: string[];
      storage_path?: string;
      is_default?: boolean;
    }) => callAssets("asset_save", { method: "POST", body: payload }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteDesignAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => callAssets("asset_delete", { method: "POST", body: { id } }),
    onSuccess: () => invalidate(qc),
  });
}

/** Sobe a imagem para o bucket privado e devolve o caminho guardado. */
export async function uploadAssetFile(file: File): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sessão expirada.");
  const safe = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `${userId}/assets/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("marina-designs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}
