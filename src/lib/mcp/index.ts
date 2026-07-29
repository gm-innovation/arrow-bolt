import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listServiceOrdersTool from "./tools/list-service-orders";
import listNotificationsTool from "./tools/list-notifications";

const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "arrow-mcp",
  title: "Arrow MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Arrow (gestão de OS, técnicos, qualidade). Todas as chamadas usam o usuário autenticado via OAuth e respeitam RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listServiceOrdersTool, listNotificationsTool],
});
