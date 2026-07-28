import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  SkipForward,
  CheckCircle2,
  Sparkles,
  MousePointerClick,
  ListChecks,
  Target,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWalkthrough } from "@/contexts/WalkthroughContext";
import { supabase } from "@/integrations/supabase/client";
import defaultAvatar from "@/assets/ai-agent-avatar.png.asset.json";

type Rect = { top: number; left: number; width: number; height: number } | null;

type Highlight = { label?: string; description?: string } | string;

const asList = (v: unknown): Highlight[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v as Highlight[];
  return [];
};

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
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleH, setBubbleH] = useState(320);
  const lastClickedStepRef = useRef<string | null>(null);
  const prevStepRef = useRef<any>(null);

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

  const step: any = active ? steps[index] : null;

  // Handle close_on_exit when leaving a step that opened a modal
  useEffect(() => {
    const previous = prevStepRef.current;
    if (previous && previous !== step && previous.close_on_exit) {
      // Try Escape first; fall back to clicking [data-radix-focus-guard] siblings' close
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true } as any));
      const btn = document.querySelector<HTMLElement>('[role="dialog"] [aria-label="Close"], [role="dialog"] [data-dismiss]');
      btn?.click();
    }
    prevStepRef.current = step;
  }, [step]);

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

    const run = async () => {
      // If action is auto_click, click the primary selector, then wait for post_action_selector
      if (step.action === "auto_click" if (step.action === "auto_click" && step.selector) {if (step.action === "auto_click" && step.selector) { step.selector && lastClickedStepRef.current !== step.id) {
        lastClickedStepRef.current = step.id;
        const clickTarget = await findEl(step.selector, 2000);
        clickTarget?.click();
        if (step.post_action_selector) {
          el = await findEl(step.post_action_selector, 4000);
        } else {
          el = clickTarget;
        }
      } else {
        el = await findEl(step.selector);
      }
      if (cancelled) return;
      compute();
      if (el && "ResizeObserver" in window) {
        ro = new ResizeObserver(compute);
        ro.observe(el);
      }
    };
    void run();

    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      cancelled = true;
      ro?.disconnect();
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [step]);

  // Measure bubble height for smart positioning
  useLayoutEffect(() => {
    if (!bubbleRef.current) return;
    const h = bubbleRef.current.getBoundingClientRect().height;
    if (h && Math.abs(h - bubbleH) > 4) setBubbleH(h);
  });

  if (!active || !step) return null;

  const avatarUrl = agent?.avatar_url || (defaultAvatar as any).url;
  const agentName = agent?.name || "Marina";
  const total = steps.length;
  const isLast = index === total - 1;

  const BUBBLE_W = 440;
  const GAP = 12;
  const MARGIN = 16;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Decide whether the bubble fits below, above, or should be centered.
  let top = vh / 2 - bubbleH / 2;
  let left = vw / 2 - BUBBLE_W / 2;
  let maxHeight = Math.min(vh - MARGIN * 2, 640);

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height) - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;
    if (spaceBelow >= Math.min(bubbleH, 220)) {
      top = rect.top + rect.height + GAP;
      maxHeight = Math.max(220, spaceBelow);
    } else if (spaceAbove >= Math.min(bubbleH, 220)) {
      top = Math.max(MARGIN, rect.top - GAP - Math.min(bubbleH, spaceAbove));
      maxHeight = Math.max(220, spaceAbove);
    } else {
      // Not enough space either way — pin bubble to right side of the viewport
      top = MARGIN;
      left = Math.max(MARGIN, vw - BUBBLE_W - MARGIN);
      maxHeight = vh - MARGIN * 2;
    }
    if (left === vw / 2 - BUBBLE_W / 2) {
      left = Math.min(vw - BUBBLE_W - MARGIN, Math.max(MARGIN, rect.left));
    }
  }

  const bubbleStyle: React.CSSProperties = {
    position: "fixed",
    top,
    left,
    width: BUBBLE_W,
    maxWidth: "calc(100vw - 32px)",
    maxHeight,
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

  const intro: string | null = step.intro ?? null;
  const highlights = asList(step.highlights);
  const howTo = asList(step.how_to_use);
  const expected: string | null = step.expected_outcome ?? null;
  const tips = asList(step.tips);
  const hasRich = intro || highlights.length || howTo.length || expected || tips.length;

  const renderItem = (h: Highlight, i: number) => {
    if (typeof h === "string") {
      return <li key={i} className="text-sm text-foreground/90 leading-relaxed">{h}</li>;
    }
    return (
      <li key={i} className="text-sm leading-relaxed">
        {h.label && <span className="font-medium text-foreground">{h.label}</span>}
        {h.label && h.description && <span className="text-muted-foreground"> — </span>}
        {h.description && <span className="text-muted-foreground">{h.description}</span>}
      </li>
    );
  };

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: any;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );

  return createPortal(
    <div>
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
        ref={bubbleRef}
        style={bubbleStyle}
        className="rounded-xl border bg-background shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/40">
            <AvatarImage src={avatarUrl} alt={agentName} className="object-cover" />
            <AvatarFallback>{agentName[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {agentName} • {script?.title}
              {step.is_substep && step.parent_title ? ` › ${step.parent_title}` : ""}
            </p>
            <h4 className="text-base font-semibold leading-tight">{step.title}</h4>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1" onClick={pause} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable body */}
        <div className="px-4 pb-3 overflow-y-auto flex-1 min-h-0">
          {intro && (
            <p className="text-sm text-foreground/90 leading-relaxed">{intro}</p>
          )}

          {!hasRich && step.body && (
            <div className="space-y-1">
              {step.body.split("\n").map((line: string, i: number) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          )}

          {highlights.length > 0 && (
            <Section icon={MousePointerClick} title="Nesta tela você vê">
              <ul className="space-y-1.5 list-disc pl-4 marker:text-primary/60">
                {highlights.map(renderItem)}
              </ul>
            </Section>
          )}

          {howTo.length > 0 && (
            <Section icon={ListChecks} title="Como usar">
              <ol className="space-y-1.5 list-decimal pl-4 marker:text-primary marker:font-semibold">
                {howTo.map(renderItem)}
              </ol>
            </Section>
          )}

          {expected && (
            <Section icon={Target} title="O que esperar">
              <p className="text-sm text-muted-foreground leading-relaxed">{expected}</p>
            </Section>
          )}

          {tips.length > 0 && (
            <Section icon={Lightbulb} title="Dicas">
              <ul className="space-y-1.5 list-disc pl-4 marker:text-amber-500">
                {tips.map(renderItem)}
              </ul>
            </Section>
          )}

          {hasRich && step.body && (
            <p className="mt-3 text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {step.body}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Passo {index + 1} de {total}
              {step.checkpoint ? " • ✓ checkpoint" : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
    </div>,
    document.body
  );
};
