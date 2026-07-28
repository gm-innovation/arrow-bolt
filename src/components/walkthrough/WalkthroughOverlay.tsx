import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Pause, SkipForward, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWalkthrough } from "@/contexts/WalkthroughContext";
import { supabase } from "@/integrations/supabase/client";
import defaultAvatar from "@/assets/ai-agent-avatar.png.asset.json";

type Rect = { top: number; left: number; width: number; height: number } | null;

const findEl = (selector: string | null, timeoutMs = 3000): Promise<HTMLElement | null> => {
  return new Promise((resolve) => {
    if (!selector) return resolve(null);
    const found = document.querySelector<HTMLElement>(selector);
    if (found) return resolve(found);

    const obs = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => {
      obs.disconnect();
      resolve(document.querySelector<HTMLElement>(selector));
    }, timeoutMs);
  });
};

export const WalkthroughOverlay = () => {
  const { active, script, steps, index, next, prev, skip, pause, complete } = useWalkthrough();
  const [rect, setRect] = useState<Rect>(null);
  const [agent, setAgent] = useState<{ name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    if (!active) return;
    (supabase as any)
      .from("ai_agents")
      .select("name, identity")
      .eq("is_default", true)
      .is("company_id", null)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setAgent({ ...(data.identity ?? {}), name: data.name });
      });
  }, [active]);

  const step = active ? steps[index] : null;

  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let el: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;

    const compute = () => {
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
    };

    findEl(step.selector).then((found) => {
      if (cancelled) return;
      el = found;
      compute();
      if (el && "ResizeObserver" in window) {
        ro = new ResizeObserver(compute);
        ro.observe(el);
      }
    });

    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [step]);

  if (!active || !step) return null;

  const avatarUrl = agent?.avatar_url || (defaultAvatar as any).url;
  const agentName = agent?.name || "Marina";
  const total = steps.length;
  const isLast = index === total - 1;

  const bubbleStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: Math.min(window.innerHeight - 340, rect.top + rect.height + 12),
        left: Math.min(window.innerWidth - 420, Math.max(16, rect.left)),
        width: 400,
        zIndex: 10000,
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 420,
        zIndex: 10000,
      };

  const pad = 8;
  const spotlightBox: React.CSSProperties | null = rect
    ? {
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 12,
        boxShadow: "0 0 0 9999px rgba(15,23,42,0.65)",
        border: "2px solid hsl(var(--primary))",
        pointerEvents: step.action === "click" ? "none" : "auto",
        zIndex: 9999,
        transition: "all 200ms ease",
      }
    : null;

  const bodyLines = step.body.split("\n").map((line, i) => (
    <p key={i} className="text-sm text-muted-foreground leading-relaxed">
      {line || "\u00A0"}
    </p>
  ));

  return createPortal(
    <div>
      {/* Full-page dim when no rect */}
      {!rect && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            zIndex: 9998,
          }}
        />
      )}
      {spotlightBox && <div style={spotlightBox} />}
      <div
        style={bubbleStyle}
        className="rounded-xl border bg-background shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/40">
            <AvatarImage src={avatarUrl} alt={agentName} className="object-cover" />
            <AvatarFallback>{agentName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">{agentName} • {script?.title}</p>
                <h4 className="text-base font-semibold leading-tight">{step.title}</h4>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={pause} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 space-y-1">{bodyLines}</div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Passo {index + 1} de {total}
                {step.checkpoint ? " • ✓ checkpoint" : ""}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={index === 0}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
              </Button>
              <Button variant="ghost" size="sm" onClick={pause}>
                <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
              </Button>
              <Button variant="ghost" size="sm" onClick={skip}>
                <SkipForward className="h-3.5 w-3.5 mr-1" /> Pular
              </Button>
              <div className="flex-1" />
              {isLast ? (
                <Button size="sm" onClick={complete}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                </Button>
              ) : (
                <Button size="sm" onClick={next}>
                  Próximo <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
