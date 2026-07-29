import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase-client";

export default defineTool({
  name: "list_service_orders",
  title: "Listar Ordens de Serviço",
  description:
    "Lista as Ordens de Serviço (OS) do Arrow visíveis ao usuário autenticado, respeitando permissões (RLS). Retorna até 50 registros ordenados pelos mais recentes.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Quantidade máxima de OS a retornar (1-50). Padrão: 20."),
    status: z
      .string()
      .optional()
      .describe("Filtrar por status exato da OS (ex.: 'pending', 'completed')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("service_orders")
      .select("id, os_number, status, service_date, client_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return {
        content: [{ type: "text", text: `Erro: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { orders: data },
    };
  },
});
