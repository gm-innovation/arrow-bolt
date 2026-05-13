import { useState } from "react";
import { useOpportunityActivities } from "@/hooks/useOpportunities";
import { ActivityTimeline } from "./ActivityTimeline";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

const TYPES = [
  { value: "call", label: "Ligação" },
  { value: "email", label: "E-mail" },
  { value: "meeting", label: "Reunião" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "proposal_sent", label: "Proposta enviada" },
  { value: "note", label: "Nota" },
  { value: "follow_up", label: "Follow-up" },
];

interface Props {
  opportunityId: string;
}

export const OpportunityActivitiesTab = ({ opportunityId }: Props) => {
  const { activities, isLoading, addActivity } = useOpportunityActivities(opportunityId);
  const [type, setType] = useState("note");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const handleAdd = () => {
    if (!description.trim()) return;
    addActivity.mutate(
      { activity_type: type, description },
      {
        onSuccess: () => {
          setDescription("");
          setType("note");
          setOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Registrar atividade
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border p-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="O que foi discutido ou feito?" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setOpen(false); setDescription(""); }}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!description.trim() || addActivity.isPending}>
              {addActivity.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded" />
      ) : (
        <ActivityTimeline activities={activities} />
      )}
    </div>
  );
};
