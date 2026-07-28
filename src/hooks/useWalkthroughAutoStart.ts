import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWalkthrough } from "@/contexts/WalkthroughContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-start a walkthrough on first login for the user's role, or after a new
 * script version is published. Runs once per session.
 */
export const useWalkthroughAutoStart = () => {
  const { user, userRole } = useAuth();
  const { startWalkthrough, active } = useWalkthrough();

  useEffect(() => {
    if (!user || !userRole || active) return;
    const key = `wt-autostart-checked:${user.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;

    let cancelled = false;
    (async () => {
      const { data: scripts } = await (supabase as any)
        .from("walkthrough_scripts")
        .select("id,slug,version,trigger")
        .eq("is_active", true)
        .eq("target_role", userRole);

      if (cancelled || !scripts?.length) return;

      const scriptIds = scripts.map((s: any) => s.id);
      const { data: prog } = await (supabase as any)
        .from("walkthrough_progress")
        .select("script_id,status,app_version_seen")
        .eq("user_id", user.id)
        .in("script_id", scriptIds);

      const progMap = new Map<string, any>((prog || []).map((p: any) => [p.script_id, p]));

      const candidate = scripts.find((s: any) => {
        const p = progMap.get(s.id);
        if (!p) return s.trigger === "first_login" || s.trigger === "on_version";
        if (p.status === "completed" && s.trigger === "on_version") {
          return String(s.version) !== String(p.app_version_seen);
        }
        if (p.status === "in_progress") return true;
        return false;
      });

      if (typeof window !== "undefined") sessionStorage.setItem(key, "1");
      if (candidate && !cancelled) {
        await startWalkthrough(candidate.slug);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userRole, active, startWalkthrough]);
};
