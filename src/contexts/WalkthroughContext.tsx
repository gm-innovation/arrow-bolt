import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WalkthroughStep = {
  id: string;
  script_id: string;
  order_index: number;
  route: string;
  selector: string | null;
  title: string;
  body: string;
  action: "none" | "click" | "navigate" | "wait";
  checkpoint: boolean;
  optional: boolean;
};

export type WalkthroughScript = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  target_role: string | null;
  module: string | null;
  version: number;
  is_active: boolean;
  trigger: "first_login" | "on_version" | "manual";
  min_app_version: string | null;
};

type State = {
  active: boolean;
  script: WalkthroughScript | null;
  steps: WalkthroughStep[];
  index: number;
  previewMode: boolean;
};

type Ctx = State & {
  startWalkthrough: (slug?: string, opts?: { preview?: boolean }) => Promise<void>;
  next: () => void;
  prev: () => void;
  skip: () => Promise<void>;
  pause: () => void;
  complete: () => Promise<void>;
  closeOverlay: () => void;
};

const WalkthroughContext = createContext<Ctx | undefined>(undefined);

const PUBLIC_ROUTE_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/public", "/q/", "/satisfaction", "/carreiras"];

export const WalkthroughProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState<State>({
    active: false,
    script: null,
    steps: [],
    index: 0,
    previewMode: false,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistProgress = useCallback(
    async (partial: { last_step_index?: number; status?: "in_progress" | "completed" | "skipped"; completed_at?: string | null }) => {
      const s = stateRef.current;
      if (!s.script || !user || s.previewMode) return;
      await (supabase as any).from("walkthrough_progress").upsert(
        {
          user_id: user.id,
          script_id: s.script.id,
          last_step_index: partial.last_step_index ?? s.index,
          status: partial.status ?? "in_progress",
          completed_at: partial.completed_at ?? null,
          app_version_seen: String(s.script.version),
        },
        { onConflict: "user_id,script_id" }
      );
    },
    [user]
  );

  const startWalkthrough = useCallback(
    async (slug?: string, opts?: { preview?: boolean }) => {
      if (!user) return;

      let scriptQuery = (supabase as any).from("walkthrough_scripts").select("*").eq("is_active", true);
      if (slug) scriptQuery = scriptQuery.eq("slug", slug);
      else if (userRole) scriptQuery = scriptQuery.eq("target_role", userRole);

      const { data: scripts } = await scriptQuery.limit(1);
      const script = (scripts as WalkthroughScript[] | null)?.[0];
      if (!script) return;

      const { data: steps } = await (supabase as any)
        .from("walkthrough_steps")
        .select("*")
        .eq("script_id", script.id)
        .order("order_index");

      if (!steps?.length) return;

      let startIndex = 0;
      if (!opts?.preview) {
        const { data: prog } = await (supabase as any)
          .from("walkthrough_progress")
          .select("last_step_index,status")
          .eq("user_id", user.id)
          .eq("script_id", script.id)
          .maybeSingle();
        if (prog?.status === "in_progress" && typeof prog.last_step_index === "number") {
          startIndex = Math.min(prog.last_step_index, steps.length - 1);
        }
      }

      setState({
        active: true,
        script,
        steps: steps as WalkthroughStep[],
        index: startIndex,
        previewMode: !!opts?.preview,
      });

      const first = (steps as WalkthroughStep[])[startIndex];
      if (first && first.route && location.pathname !== first.route) {
        navigate(first.route);
      }
    },
    [user, userRole, navigate, location.pathname]
  );

  const goTo = useCallback(
    (nextIndex: number) => {
      setState((s) => {
        if (!s.active) return s;
        const clamped = Math.max(0, Math.min(nextIndex, s.steps.length - 1));
        const step = s.steps[clamped];
        if (step && step.route && location.pathname !== step.route) {
          navigate(step.route);
        }
        void persistProgress({ last_step_index: clamped });
        return { ...s, index: clamped };
      });
    },
    [navigate, location.pathname, persistProgress]
  );

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.index >= s.steps.length - 1) {
      void (async () => {
        await persistProgress({ status: "completed", completed_at: new Date().toISOString(), last_step_index: s.steps.length - 1 });
        setState((prev) => ({ ...prev, active: false }));
      })();
    } else {
      goTo(s.index + 1);
    }
  }, [goTo, persistProgress]);

  const prev = useCallback(() => goTo(stateRef.current.index - 1), [goTo]);

  const skip = useCallback(async () => {
    await persistProgress({ status: "skipped" });
    setState((s) => ({ ...s, active: false }));
  }, [persistProgress]);

  const pause = useCallback(() => {
    void persistProgress({ status: "in_progress" });
    setState((s) => ({ ...s, active: false }));
  }, [persistProgress]);

  const complete = useCallback(async () => {
    await persistProgress({ status: "completed", completed_at: new Date().toISOString() });
    setState((s) => ({ ...s, active: false }));
  }, [persistProgress]);

  const closeOverlay = useCallback(() => setState((s) => ({ ...s, active: false })), []);

  // Do not run on public routes
  useEffect(() => {
    if (state.active && PUBLIC_ROUTE_PREFIXES.some((p) => location.pathname.startsWith(p))) {
      setState((s) => ({ ...s, active: false }));
    }
  }, [location.pathname, state.active]);

  const value = useMemo<Ctx>(
    () => ({ ...state, startWalkthrough, next, prev, skip, pause, complete, closeOverlay }),
    [state, startWalkthrough, next, prev, skip, pause, complete, closeOverlay]
  );

  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
};

export const useWalkthrough = () => {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error("useWalkthrough must be used within WalkthroughProvider");
  return ctx;
};
