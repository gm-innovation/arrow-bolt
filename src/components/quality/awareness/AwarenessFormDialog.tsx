import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityAwarenessEvents, ExternalAttendee } from "@/hooks/useQualityAwareness";

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
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const [externalAttendees, setExternalAttendees] = useState<ExternalAttendee[]>([]);
  const [extName, setExtName] = useState("");
  const [extCompany, setExtCompany] = useState("");
  const [extEmail, setExtEmail] = useState("");

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
    setExternalAttendees([]);
    setExtName("");
    setExtCompany("");
    setExtEmail("");
  }, [open, profile?.company_id]);

  const toggle = (id: string) =>
    setAttendees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && pickerRef.current?.contains(target)) return;
      closePicker();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, pickerOpen]);

  const addExternal = () => {
    const name = extName.trim();
    if (!name) return;
    setExternalAttendees((prev) => [
      ...prev,
      { name, company: extCompany.trim() || undefined, email: extEmail.trim() || undefined },
    ]);
    setExtName("");
    setExtCompany("");
    setExtEmail("");
  };

  const removeExternal = (idx: number) =>
    setExternalAttendees((prev) => prev.filter((_, i) => i !== idx));

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => (u.full_name || "").toLowerCase().includes(term));
  }, [search, users]);

  const submit = async () => {
    if (!topic.trim()) return;
    await create.mutateAsync({
      topic: topic.trim(),
      description,
      event_date: eventDate,
      evidence_url: evidenceUrl || undefined,
      attendees,
      external_attendees: externalAttendees,
    });
    closePicker();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) closePicker();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div ref={pickerRef} className="space-y-2">
            <Label>Participantes internos ({attendees.length})</Label>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((prev) => !prev)}
            >
              Selecionar colaboradores...
            </Button>
            {pickerOpen && (
              <div className="overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-sm">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                  {filteredUsers.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum colaborador encontrado.
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = attendees.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggle(u.id)}
                          className={cn(
                            "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                            checked && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                          <span className="min-w-0 flex-1 truncate">{u.full_name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
            <p className="text-xs text-muted-foreground">
              Colaboradores internos recebem notificação in-app para confirmar ciência.
            </p>
          </div>

          <div className="space-y-2 border rounded-md p-3 bg-muted/20">
            <Label>Participantes externos ({externalAttendees.length})</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2">
              <Input placeholder="Nome *" value={extName} onChange={(e) => setExtName(e.target.value)} />
              <Input placeholder="Empresa" value={extCompany} onChange={(e) => setExtCompany(e.target.value)} />
              <Input placeholder="E-mail (opcional)" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} />
              <Button type="button" variant="outline" onClick={addExternal} disabled={!extName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {externalAttendees.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {externalAttendees.map((a, i) => (
                  <Badge key={i} variant="outline" className="gap-1">
                    {a.name}{a.company ? ` · ${a.company}` : ""}
                    <button onClick={() => removeExternal(i)} className="ml-1 hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Ex.: cliente auditando, visitante, prestador. Ficam registrados apenas para evidência.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!topic.trim() || create.isPending}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AwarenessFormDialog;
