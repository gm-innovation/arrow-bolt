import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export type ImprovementOriginType =
  | "ncr"
  | "audit"
  | "deviation"
  | "satisfaction"
  | "critical_review"
  | "risk";

interface Props {
  originType: ImprovementOriginType;
  originId: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultCategory?: string;
  label?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost" | "secondary";
  iconOnly?: boolean;
}

const ORIGIN_LABEL: Record<ImprovementOriginType, string> = {
  ncr: "NCR",
  audit: "Auditoria",
  deviation: "Desvio",
  satisfaction: "Satisfação / Voz do Cliente",
  critical_review: "Análise Crítica",
  risk: "Risco",
};

export default function CreateImprovementFromButton({
  originType, originId, defaultTitle = "", defaultDescription = "",
  defaultCategory, label, size = "sm", variant = "outline", iconOnly = false,
}: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: defaultTitle,
    description: defaultDescription,
    category: defaultCategory ?? `Originado de ${ORIGIN_LABEL[originType]}`,
    priority: "medium" as "high" | "medium" | "low",
    due_date: "",
  });

  const submit = async () => {
    if (!form.title.trim() || !profile?.company_id || !user?.id) return;
    setBusy(true);
    const { error } = await supabase
      .from("quality_improvements_manual" as any)
      .insert({
        company_id: profile.company_id,
        submitted_by: user.id,
        title: form.title.trim(),
        description: form.description || null,
        category: form.category || null,
        priority: form.priority,
        due_date: form.due_date || null,
        origin_type: originType,
        origin_id: originId,
      });
    setBusy(false);
    if (error) {
      toast({ title: "Erro ao criar melhoria", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Melhoria registrada", description: `Vinculada à origem ${ORIGIN_LABEL[originType]}.` });
    qc.invalidateQueries({ queryKey: ["quality_improvements"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} title="Criar melhoria a partir deste registro">
          <Sparkles className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{label ?? "Criar melhoria"}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar melhoria a partir de {ORIGIN_LABEL[originType]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || !form.title.trim()}>
            {busy ? "Registrando…" : "Registrar melhoria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
