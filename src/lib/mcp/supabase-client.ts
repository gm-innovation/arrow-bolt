import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";

// process is available at runtime (Deno edge function bundle), but TS doesn't
// know it in the app tsconfig. Declare it locally to keep the entry import-safe
// and avoid pulling @types/node.
declare const process: { env: Record<string, string | undefined> };

export function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
