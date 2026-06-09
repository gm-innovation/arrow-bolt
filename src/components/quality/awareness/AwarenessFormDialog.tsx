import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityAwarenessEvents } from "@/hooks/useQualityAwareness";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AwarenessFormDialog = ({ open, onOpenChange }: Props) => {
  const { profile } = useAuth();
  const { create } = useQualityAwarenessEvents();
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!open || !profile?.company_id) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile.company_id)
        .order("full_name");
      setUsers((data ?? []) as any);
    })();
    setTopic("");
    setDescription("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEvidenceUrl("");
    setAttendees([]);
  }, [open, profile?.company_id]);

  const toggle = (id: string) =>
    setAttendees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (!topic.trim()) return;
    await create.mutateAsync({
      topic: topic.trim(),
      description,
      event_date: eventDate,
      evidence_url: evidenceUrl || undefined,
      attendees,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Evento de Conscientização</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1">
            <Label>Tema *</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Divulgação da Política da Qualidade" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>URL da evidência</Label>
              <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="ata, foto, vídeo..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Participantes ({attendees.length})</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">Selecionar participantes...</Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar..." />
                  <CommandList>
                    <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                    <CommandGroup>
                      {users.map((u) => {
                        const checked = attendees.includes(u.id);
                        return (
                          <CommandItem key={u.id} onSelect={() => toggle(u.id)}>
                            <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                            {u.full_name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {attendees.map((id) => {
                  const u = users.find((x) => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {u?.full_name || id.slice(0, 6)}
                      <button onClick={() => toggle(id)} className="ml-1 hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!topic.trim() || create.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AwarenessFormDialog;
