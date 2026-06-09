import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import {
  useQualityHomologations,
  type HomologationStatus,
} from "@/hooks/useQualityHomologations";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const NewHomologationDialog = ({ open, onOpenChange }: Props) => {
  const { create } = useQualityHomologations();
  const [cycle, setCycle] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState<HomologationStatus>("em_andamento");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!cycle.trim()) return;
    await create.mutateAsync({ cycle: cycle.trim(), status, notes, file });
    setCycle(String(new Date().getFullYear()));
    setStatus("em_andamento");
    setNotes("");
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova homologação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ciclo</Label>
            <Input
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
              placeholder="Ex.: 2026"
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as HomologationStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="homologado">Homologado</SelectItem>
                <SelectItem value="homologado_com_ressalvas">
                  Homologado com ressalvas
                </SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Resumo do ciclo, ressalvas, etc."
            />
          </div>
          <div className="space-y-2">
            <Label>PDF assinado (opcional)</Label>
            <div className="relative">
              <Button type="button" variant="outline" className="w-full justify-start">
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Selecionar PDF"}
              </Button>
              <input
                type="file"
                accept="application/pdf"
                className="opacity-0 absolute inset-0 cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewHomologationDialog;
