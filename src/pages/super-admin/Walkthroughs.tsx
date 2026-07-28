import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Play, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useWalkthrough } from "@/contexts/WalkthroughContext";

const ROLES = [
  "super_admin", "director", "coordinator", "admin", "manager", "technician",
  "hr", "commercial", "compras", "qualidade", "financeiro", "marketing",
];

type Script = any;
type Step = any;

const emptyStep = (script_id: string, order_index: number): Step => ({
  script_id,
  order_index,
  route: "/",
  selector: null,
  title: "",
  body: "",
  action: "none",
  checkpoint: false,
  optional: false,
});

export default function Walkthroughs() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const { startWalkthrough } = useWalkthrough();

  const { data: scripts = [] } = useQuery({
    queryKey: ["wt-scripts-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("walkthrough_scripts")
        .select("*")
        .order("target_role")
        .order("title");
      if (error) throw error;
      return data as Script[];
    },
  });

  useEffect(() => {
    if (!selectedId && scripts.length) setSelectedId(scripts[0].id);
  }, [scripts, selectedId]);

  const { data: steps = [] } = useQuery({
    queryKey: ["wt-steps", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("walkthrough_steps")
        .select("*")
        .eq("script_id", selectedId)
        .order("order_index");
      if (error) throw error;
      return data as Step[];
    },
  });

  const selectedScript = scripts.find((s) => s.id === selectedId);

  const saveScript = async (form: Script) => {
    const payload = {
      slug: form.slug,
      title: form.title,
      description: form.description || null,
      target_role: form.target_role || null,
      module: form.module || null,
      version: form.version || 1,
      is_active: !!form.is_active,
      trigger: form.trigger || "first_login",
    };
    const { error } = form.id
      ? await (supabase as any).from("walkthrough_scripts").update(payload).eq("id", form.id)
      : await (supabase as any).from("walkthrough_scripts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Roteiro salvo");
    setEditingScript(null);
    qc.invalidateQueries({ queryKey: ["wt-scripts-admin"] });
  };

  const deleteScript = async (id: string) => {
    if (!confirm("Excluir este roteiro e todos os passos?")) return;
    const { error } = await (supabase as any).from("walkthrough_scripts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Roteiro removido");
    if (selectedId === id) setSelectedId(null);
    qc.invalidateQueries({ queryKey: ["wt-scripts-admin"] });
  };

  const saveStep = async (form: Step) => {
    const payload = {
      script_id: form.script_id,
      order_index: Number(form.order_index) || 0,
      route: form.route || "/",
      selector: form.selector || null,
      title: form.title,
      body: form.body,
      action: form.action || "none",
      checkpoint: !!form.checkpoint,
      optional: !!form.optional,
    };
    const { error } = form.id
      ? await (supabase as any).from("walkthrough_steps").update(payload).eq("id", form.id)
      : await (supabase as any).from("walkthrough_steps").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Passo salvo");
    setEditingStep(null);
    qc.invalidateQueries({ queryKey: ["wt-steps", selectedId] });
  };

  const deleteStep = async (id: string) => {
    if (!confirm("Excluir este passo?")) return;
    const { error } = await (supabase as any).from("walkthrough_steps").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wt-steps", selectedId] });
  };

  const moveStep = async (step: Step, dir: -1 | 1) => {
    const neighbor = steps.find((s) => s.order_index === step.order_index + dir);
    if (!neighbor) return;
    await (supabase as any).from("walkthrough_steps").update({ order_index: neighbor.order_index }).eq("id", step.id);
    await (supabase as any).from("walkthrough_steps").update({ order_index: step.order_index }).eq("id", neighbor.id);
    qc.invalidateQueries({ queryKey: ["wt-steps", selectedId] });
  };

  const previewScript = async (slug: string) => {
    await startWalkthrough(slug, { preview: true });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Walkthroughs guiados</h1>
          <p className="text-sm text-muted-foreground">
            Roteiros interativos apresentados pela Marina para cada papel do sistema.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditingScript({
              slug: "",
              title: "",
              description: "",
              target_role: "",
              module: "",
              version: 1,
              is_active: true,
              trigger: "first_login",
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Novo roteiro
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roteiros ({scripts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
            {scripts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left rounded-md px-3 py-2 border ${
                  selectedId === s.id ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{s.title}</span>
                  {!s.is_active && <Badge variant="outline" className="text-[10px]">off</Badge>}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {s.target_role && <Badge variant="secondary" className="text-[10px]">{s.target_role}</Badge>}
                  {s.module && <Badge variant="outline" className="text-[10px]">{s.module}</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">v{s.version}</span>
                </div>
              </button>
            ))}
            {!scripts.length && <p className="text-xs text-muted-foreground p-3">Nenhum roteiro ainda.</p>}
          </CardContent>
        </Card>

        {selectedScript && (
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-lg">{selectedScript.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedScript.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">Papel: {selectedScript.target_role ?? "—"}</Badge>
                  <Badge variant="outline">Gatilho: {selectedScript.trigger}</Badge>
                  <Badge variant="outline">v{selectedScript.version}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => previewScript(selectedScript.slug)}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Testar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingScript(selectedScript)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteScript(selectedScript.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Passos ({steps.length})</h3>
                <Button
                  size="sm"
                  onClick={() =>
                    setEditingStep(emptyStep(selectedScript.id, (steps[steps.length - 1]?.order_index ?? -1) + 1))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar passo
                </Button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {steps.map((step) => (
                  <div key={step.id} className="border rounded-md p-3 flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(step, -1)}>
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-center">{step.order_index}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveStep(step, 1)}>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{step.title}</span>
                        {step.checkpoint && <Badge variant="secondary" className="text-[10px]">checkpoint</Badge>}
                        {step.optional && <Badge variant="outline" className="text-[10px]">opcional</Badge>}
                        <Badge variant="outline" className="text-[10px] font-mono">{step.route}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{step.body}</p>
                      {step.selector && (
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">selector: {step.selector}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingStep(step)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteStep(step.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!steps.length && <p className="text-sm text-muted-foreground">Nenhum passo cadastrado.</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Script editor */}
      <Dialog open={!!editingScript} onOpenChange={(open) => !open && setEditingScript(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingScript?.id ? "Editar roteiro" : "Novo roteiro"}</DialogTitle>
            <DialogDescription>Metadados do walkthrough.</DialogDescription>
          </DialogHeader>
          {editingScript && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Slug</Label>
                  <Input value={editingScript.slug} onChange={(e) => setEditingScript({ ...editingScript, slug: e.target.value })} />
                </div>
                <div>
                  <Label>Versão</Label>
                  <Input type="number" value={editingScript.version} onChange={(e) => setEditingScript({ ...editingScript, version: +e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={editingScript.title} onChange={(e) => setEditingScript({ ...editingScript, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editingScript.description ?? ""} onChange={(e) => setEditingScript({ ...editingScript, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Papel alvo</Label>
                  <Select value={editingScript.target_role ?? ""} onValueChange={(v) => setEditingScript({ ...editingScript, target_role: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Módulo</Label>
                  <Input value={editingScript.module ?? ""} onChange={(e) => setEditingScript({ ...editingScript, module: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 items-end">
                <div>
                  <Label>Gatilho</Label>
                  <Select value={editingScript.trigger} onValueChange={(v) => setEditingScript({ ...editingScript, trigger: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_login">Primeiro login</SelectItem>
                      <SelectItem value="on_version">Nova versão</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={editingScript.is_active} onCheckedChange={(v) => setEditingScript({ ...editingScript, is_active: v })} />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingScript(null)}>Cancelar</Button>
            <Button onClick={() => saveScript(editingScript!)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step editor */}
      <Dialog open={!!editingStep} onOpenChange={(open) => !open && setEditingStep(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStep?.id ? "Editar passo" : "Novo passo"}</DialogTitle>
            <DialogDescription>Conteúdo apresentado pela Marina.</DialogDescription>
          </DialogHeader>
          {editingStep && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editingStep.order_index} onChange={(e) => setEditingStep({ ...editingStep, order_index: +e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Rota</Label>
                  <Input value={editingStep.route} onChange={(e) => setEditingStep({ ...editingStep, route: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Título</Label>
                <Input value={editingStep.title} onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })} />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea rows={5} value={editingStep.body} onChange={(e) => setEditingStep({ ...editingStep, body: e.target.value })} />
              </div>
              <div>
                <Label>Seletor CSS (opcional)</Label>
                <Input placeholder='ex: [data-tour="my-target"]' value={editingStep.selector ?? ""} onChange={(e) => setEditingStep({ ...editingStep, selector: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <Label>Ação</Label>
                  <Select value={editingStep.action} onValueChange={(v) => setEditingStep({ ...editingStep, action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      <SelectItem value="click">Clique</SelectItem>
                      <SelectItem value="navigate">Navegar</SelectItem>
                      <SelectItem value="wait">Aguardar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editingStep.checkpoint} onCheckedChange={(v) => setEditingStep({ ...editingStep, checkpoint: v })} />
                  <Label>Checkpoint</Label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editingStep.optional} onCheckedChange={(v) => setEditingStep({ ...editingStep, optional: v })} />
                  <Label>Opcional</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingStep(null)}>Cancelar</Button>
            <Button onClick={() => saveStep(editingStep!)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
