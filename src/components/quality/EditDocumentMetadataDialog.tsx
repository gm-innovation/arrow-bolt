import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useQualityProcesses } from "@/hooks/useQualityProcesses";
import { toast } from "@/hooks/use-toast";
import { parseISO } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  document: any;
}

const EditDocumentMetadataDialog = ({ open, onOpenChange, document }: Props) => {
  const { update } = useQualityDocuments();
  const { data: companyUsers = [] } = useCompanyUsers();
  const [form, setForm] = useState({
    title: "",
    classification: "",
    normative_reference: "",
    next_review_date: "",
    widely_visible: false,
    responsible_user_id: "",
    control_mode: "" as "" | "controlled" | "uncontrolled",
  });

  useEffect(() => {
    if (document && open) {
      setForm({
        title: document.title || "",
        classification: document.classification || "",
        normative_reference: document.normative_reference || "",
        next_review_date: document.next_review_date || "",
        widely_visible: !!document.widely_visible,
        responsible_user_id: document.responsible_user_id || "",
        control_mode: (document.control_mode as any) || "",
      });
    }
  }, [document, open]);

  const submit = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (form.next_review_date && document.published_at) {
      const pub = parseISO(document.published_at);
      const nxt = parseISO(form.next_review_date);
      if (nxt <= pub) {
        toast({
          title: "Data inválida",
          description: "A próxima revisão deve ser posterior à data de publicação.",
          variant: "destructive",
        });
        return;
      }
    }
    await update.mutateAsync({
      id: document.id,
      title: form.title.trim(),
      classification: form.classification || null,
      normative_reference: form.normative_reference || null,
      next_review_date: form.next_review_date || null,
      widely_visible: form.widely_visible,
      responsible_user_id: form.responsible_user_id || null,
      control_mode: form.control_mode || null,
    } as any);
    toast({ title: "Metadados atualizados" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar metadados do documento</DialogTitle>
          <DialogDescription>
            Atualize título, classificação, referência normativa, próxima revisão e visibilidade.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Classificação</Label>
              <Input
                placeholder="interno, cliente, etc."
                value={form.classification}
                onChange={(e) => setForm({ ...form, classification: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Referência normativa</Label>
              <Input
                value={form.normative_reference}
                onChange={(e) => setForm({ ...form, normative_reference: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Próxima revisão</Label>
            <Input
              type="date"
              value={form.next_review_date}
              onChange={(e) => setForm({ ...form, next_review_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Deve ser posterior à data de publicação. Ao publicar uma nova versão, este campo é recalculado conforme o ciclo configurado em Parâmetros do SGQ.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Select
                value={form.responsible_user_id || "none"}
                onValueChange={(v) => setForm({ ...form, responsible_user_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável —</SelectItem>
                  {(companyUsers as any[]).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cópia</Label>
              <Select
                value={form.control_mode || "inherit"}
                onValueChange={(v) => setForm({ ...form, control_mode: (v === "inherit" ? "" : v) as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Herdar do tipo</SelectItem>
                  <SelectItem value="controlled">Controlada</SelectItem>
                  <SelectItem value="uncontrolled">Não controlada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                "Não controlada" aplica marca d'água no visualizador.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label className="text-sm">Visibilidade ampliada</Label>
              <p className="text-xs text-muted-foreground">Quando ligado, todos os colaboradores podem visualizar.</p>
            </div>
            <Switch
              checked={form.widely_visible}
              onCheckedChange={(v) => setForm({ ...form, widely_visible: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={update.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDocumentMetadataDialog;
