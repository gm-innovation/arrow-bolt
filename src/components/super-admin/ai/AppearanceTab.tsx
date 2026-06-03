import { AIAgent } from "@/hooks/useAIAgents";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

const ROLES = ["technician", "coordinator", "manager", "director", "hr", "commercial", "financeiro", "qualidade", "compras"];
const ICONS = ["Bot", "MessageCircle", "Sparkles", "Brain"];

export function AppearanceTab({ agent, draft, setDraft }: Props) {
  const a = { ...agent.appearance, ...(draft.appearance ?? {}) };
  const update = (patch: Partial<typeof a>) =>
    setDraft({ ...draft, appearance: { ...a, ...patch } });

  const visibleRoles = a.visible_roles ?? ROLES;
  const toggleRole = (r: string, on: boolean) =>
    update({ visible_roles: on ? [...visibleRoles, r] : visibleRoles.filter((x) => x !== r) });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Posição na tela</Label>
          <Select value={a.position ?? "bottom-right"} onValueChange={(v) => update({ position: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">Inferior direito</SelectItem>
              <SelectItem value="bottom-left">Inferior esquerdo</SelectItem>
              <SelectItem value="top-right">Superior direito</SelectItem>
              <SelectItem value="top-left">Superior esquerdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tamanho</Label>
          <Select value={a.size ?? "medium"} onValueChange={(v) => update({ size: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Compacto</SelectItem>
              <SelectItem value="medium">Médio</SelectItem>
              <SelectItem value="large">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Cor primária</Label>
          <Input
            value={a.primary_color ?? "hsl(var(--primary))"}
            onChange={(e) => update({ primary_color: e.target.value })}
            placeholder="hsl(220 90% 50%)"
          />
        </div>
        <div>
          <Label>Forma do botão</Label>
          <Select value={a.shape ?? "circle"} onValueChange={(v) => update({ shape: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="circle">Círculo</SelectItem>
              <SelectItem value="rounded">Quadrado</SelectItem>
              <SelectItem value="pill">Pílula</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ícone</Label>
          <Select value={a.icon ?? "Bot"} onValueChange={(v) => update({ icon: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Animação</Label>
          <Select value={a.animation ?? "fade"} onValueChange={(v) => update({ animation: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">Fade</SelectItem>
              <SelectItem value="slide-up">Slide-up</SelectItem>
              <SelectItem value="bounce">Bounce</SelectItem>
              <SelectItem value="none">Nenhuma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tema</Label>
          <Select value={a.theme ?? "auto"} onValueChange={(v) => update({ theme: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Claro</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="auto">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar badge com nome ao lado do botão</Label>
        <Switch checked={a.badge ?? false} onCheckedChange={(v) => update({ badge: v })} />
      </div>

      <div>
        <Label>Visível para roles</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox checked={visibleRoles.includes(r)} onCheckedChange={(v) => toggleRole(r, !!v)} />
              <span className="capitalize">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label>Rotas ocultas (uma por linha, suporta wildcards: /admin/*)</Label>
        <Textarea
          value={(a.hidden_routes ?? []).join("\n")}
          onChange={(e) => update({ hidden_routes: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
          rows={3}
        />
      </div>
    </div>
  );
}
