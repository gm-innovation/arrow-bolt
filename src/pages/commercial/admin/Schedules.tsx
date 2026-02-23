import { useRecurrences } from "@/hooks/useRecurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, List, Calendar } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const getStatusBadge = (nextDate: string) => {
  const today = startOfDay(new Date());
  const d = startOfDay(new Date(nextDate));
  if (isBefore(d, today)) return <Badge variant="destructive">Atrasado</Badge>;
  const diff = (d.getTime() - today.getTime()) / 86400000;
  if (diff <= 7) return <Badge className="bg-amber-100 text-amber-700">Pendente</Badge>;
  return <Badge variant="secondary">Agendado</Badge>;
};

const AdminSchedules = () => {
  const { recurrences, isLoading } = useRecurrences();

  const sorted = [...recurrences].sort((a: any, b: any) => new Date(a.next_date).getTime() - new Date(b.next_date).getTime());

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
    </div>
  );
};

export default AdminSchedules;
