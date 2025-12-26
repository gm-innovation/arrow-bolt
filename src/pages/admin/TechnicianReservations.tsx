import { useState, useEffect } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Calendar,
  User,
  Ship,
  Building2,
  Plane,
  Moon,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTechnicianReservations,
  TechnicianReservation,
} from "@/hooks/useTechnicianReservations";
import { NewReservationDialog } from "@/components/admin/reservations/NewReservationDialog";

const statusConfig = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-800 border-amber-300" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800 border-blue-300" },
  released: { label: "Liberado", color: "bg-green-100 text-green-800 border-green-300" },
  converted: { label: "Convertido", color: "bg-purple-100 text-purple-800 border-purple-300" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-600 border-gray-300" },
};

const TechnicianReservations = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<TechnicianReservation | null>(null);
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);

  const { reservations, isLoading, cancelReservation, releaseReservation } =
    useTechnicianReservations(selectedMonth, companyId);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      setCompanyId(data?.company_id || undefined);
    };
    fetchCompany();
  }, [user?.id]);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!companyId) return;
      const { data } = await supabase
        .from("technicians")
        .select("id, profiles:user_id(full_name)")
        .eq("company_id", companyId)
        .eq("active", true);

      setTechnicians(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.profiles?.full_name || "Técnico",
        }))
      );
    };
    fetchTechnicians();
  }, [companyId]);

  const filteredReservations = reservations.filter((r) => {
    if (technicianFilter !== "all" && r.technician_id !== technicianFilter) {
      return false;
    }
    if (statusFilter === "active" && !["pending", "confirmed"].includes(r.status)) {
      return false;
    }
    if (statusFilter !== "active" && statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleCancel = (reservation: TechnicianReservation) => {
    setSelectedReservation(reservation);
    setCancelDialogOpen(true);
  };

  const handleRelease = (reservation: TechnicianReservation) => {
    setSelectedReservation(reservation);
    setReleaseDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (selectedReservation) {
      await cancelReservation.mutateAsync(selectedReservation.id);
      setCancelDialogOpen(false);
      setSelectedReservation(null);
    }
  };

  const confirmRelease = async () => {
    if (selectedReservation) {
      await releaseReservation.mutateAsync(selectedReservation.id);
      setReleaseDialogOpen(false);
      setSelectedReservation(null);
    }
  };

  const isMultiDay = (start: string, end: string) => start !== end;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservas de Técnicos</h1>
          <p className="text-muted-foreground">
            Gerencie reservas e bloqueios de agenda dos técnicos
          </p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Reserva
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Técnico</label>
              <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="released">Liberado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhuma reserva encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Crie uma nova reserva para bloquear a agenda de um técnico
              </p>
              <Button onClick={() => setNewDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Reserva
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Main Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={statusConfig[reservation.status].color}
                      >
                        {statusConfig[reservation.status].label}
                      </Badge>
                      {reservation.includes_travel && (
                        <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                          <Plane className="h-3 w-3 mr-1" />
                          Viagem
                        </Badge>
                      )}
                      {reservation.includes_overnight && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          <Moon className="h-3 w-3 mr-1" />
                          Pernoite
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{reservation.technician_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(parseISO(reservation.start_date), "dd/MM/yyyy", { locale: ptBR })}
                        {isMultiDay(reservation.start_date, reservation.end_date) && (
                          <> até {format(parseISO(reservation.end_date), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                        {reservation.start_time && (
                          <> • {reservation.start_time.slice(0, 5)}</>
                        )}
                        {reservation.end_time && (
                          <> - {reservation.end_time.slice(0, 5)}</>
                        )}
                      </span>
                    </div>

                    {(reservation.client_name || reservation.vessel_name) && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {reservation.client_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {reservation.client_name}
                          </div>
                        )}
                        {reservation.vessel_name && (
                          <div className="flex items-center gap-1">
                            <Ship className="h-4 w-4" />
                            {reservation.vessel_name}
                          </div>
                        )}
                      </div>
                    )}

                    {reservation.reason && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Motivo:</span> {reservation.reason}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Reservado por {reservation.reserved_by_name} em{" "}
                      {format(parseISO(reservation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {/* Actions */}
                  {["pending", "confirmed"].includes(reservation.status) && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRelease(reservation)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Liberar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancel(reservation)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NewReservationDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Reserva</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta reserva? O técnico ficará disponível
              novamente para outras alocações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Cancelar Reserva</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar Técnico</AlertDialogTitle>
            <AlertDialogDescription>
              Ao liberar o técnico, ele ficará disponível para ser alocado em outros
              serviços. A reserva será marcada como "Liberado".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRelease}>Liberar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TechnicianReservations;
