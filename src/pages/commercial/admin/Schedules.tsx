import { useRecurrences } from "@/hooks/useRecurrences";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CalendarClock, List, Calendar, Eye } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

const getStatusBadge = (nextDate: string) => {
  const today = startOfDay(new Date());
  const d = startOfDay(new Date(nextDate));
  if (isBefore(d, today)) return <Badge variant="destructive">Atrasado</Badge>;
  const diff = (d.getTime() - today.getTime()) / 86400000;
  if (diff <= 7) return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>;
  return <Badge variant="secondary">Agendado</Badge>;
};

const AdminSchedules = () => {
  const { recurrences, isLoading, updateRecurrence } = useRecurrences();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form
  const [editNextDate, setEditNextDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const sorted = [...recurrences].sort((a: any, b: any) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());

  const openSheet = (r: any) => {
    setSelectedItem(r);
    setEditNextDate(r.next_date?.split("T")[0] || "");
    setEditStatus(r.status || "active");
    setEditNotes(r.notes || "");
    setEditing(false);
    setSheetOpen(true);
  };

  const handleSave = () => {
    if (!selectedItem) return;
    updateRecurrence.mutate({
      id: selectedItem.id,
      next_date: editNextDate,
      status: editStatus,
      notes: editNotes || null,
    }, {
      onSuccess: () => {
        setSheetOpen(false);
        setSelectedItem(null);
        setEditing(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Agendamentos e Lembretes</h2>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" /> Calendário
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum agendamento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{r.recurrence_type || r.periodicity}</Badge>
                          <span className="text-sm font-medium text-foreground truncate">{r.clients?.name || "Cliente"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{r.crm_products?.name || "Serviço"}</span>
                          <span>·</span>
                          <span>{r.profiles?.full_name || "Sem responsável"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(r.next_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        {getStatusBadge(r.next_date)}
                        <Button variant="ghost" size="icon" onClick={() => openSheet(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-12">Visualização de calendário em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Agendamento</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="space-y-6 mt-6">
              {/* Info Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedItem.recurrence_type || selectedItem.periodicity}</Badge>
                  {getStatusBadge(selectedItem.next_date)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{selectedItem.clients?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Serviço / Produto</p>
                  <p className="font-medium text-foreground">{selectedItem.crm_products?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Responsável</p>
                  <p className="font-medium text-foreground">{selectedItem.profiles?.full_name || "—"}</p>
                </div>
                {selectedItem.estimated_value && (
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Estimado</p>
                    <p className="font-medium text-foreground">R$ {Number(selectedItem.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Editable Section */}
              {!editing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Próxima Data</p>
                    <p className="font-medium text-foreground">{format(new Date(selectedItem.next_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="secondary">{selectedItem.status === "active" ? "Ativo" : selectedItem.status === "paused" ? "Pausado" : "Cancelado"}</Badge>
                  </div>
                  {selectedItem.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observações</p>
                      <p className="text-sm text-foreground">{selectedItem.notes}</p>
                    </div>
                  )}
                  <Button variant="outline" onClick={() => setEditing(true)} className="w-full mt-4">Editar</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Próxima Data</Label>
                    <Input type="date" value={editNextDate} onChange={(e) => setEditNextDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="paused">Pausado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                  </div>
                </div>
              )}
            </div>
          )}

          {editing && (
            <SheetFooter className="mt-6">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={updateRecurrence.isPending}>
                {updateRecurrence.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminSchedules;
