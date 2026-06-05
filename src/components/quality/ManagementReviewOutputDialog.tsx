import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OUTPUT_LABELS, ReviewOutputType, useManagementReview } from "@/hooks/useManagementReview";
import { useUsers } from "@/hooks/useUsers";

interface Props {
  reviewId: string;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}

const ManagementReviewOutputDialog = ({ reviewId, open, onOpenChange }: Props) => {
  const { addOutput } = useManagementReview(reviewId);
  const { users } = useUsers();
  const [form, setForm] = useState<{ output_type: ReviewOutputType; description: string; responsible_user_id: string; due_date: string }>({
    output_type: "improvement_opportunity",
    description: "",
    responsible_user_id: "",
    due_date: "",
  });

  const reset = () => setForm({ output_type: "improvement_opportunity", description: "", responsible_user_id: "", due_date: "" });

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova saída da análise crítica</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.output_type} onValueChange={(v: ReviewOutputType) => setForm({ ...form, output_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(OUTPUT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Responsável</Label>
              <Select value={form.responsible_user_id} onValueChange={(v) => setForm({ ...form, responsible_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Saídas com responsável e prazo definidos geram automaticamente um Plano de Ação quando a reunião é fechada.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!form.description.trim() || addOutput.isPending}
            onClick={async () => {
              await addOutput.mutateAsync({
                output_type: form.output_type,
                description: form.description,
                responsible_user_id: form.responsible_user_id || null,
                due_date: form.due_date || null,
              } as any);
              onOpenChange(false);
              reset();
            }}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManagementReviewOutputDialog;
