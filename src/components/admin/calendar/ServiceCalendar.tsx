import { useState, useEffect } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { DayEventsDialog } from "./DayEventsDialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useCalendarAbsences, CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { CalendarLegend } from "./CalendarLegend";
import { CALENDAR_CATEGORIES, type CalendarCategory } from "./eventStyles";

import { ViewOrderDetailsDialog } from "@/components/admin/orders/ViewOrderDetailsDialog";
import { AuvoTaskDetailsDialog } from "./AuvoTaskDetailsDialog";
import { ScheduleEntryDetailsDialog, type ScheduleEntry } from "./ScheduleEntryDetailsDialog";

export type CalendarServiceOrder = {
  id: string;
  order_number: string;
  vessel_name: string;
  client_name?: string;
  supervisor_name?: string;
  status: string;
  scheduled_time: string;
  scheduled_date: Date;
  duration?: string;
  task_type?: string;
  description?: string;
  location?: string;
  technician_names?: string[];
  lead_technician?: string;
  auxiliary_technicians?: string[];
  auvo_team_name?: string;
  auvo_technician_names?: string[];
  auvo_vessel_name?: string;
  event_source?: "arrow" | "auvo";
  auvo_task_uid?: string;
  auvo_status?: string;
  linked_service_order_id?: string;
  /** Origem do escopo/descrição exibida (Auvo é a fonte operacional; Omie é fiscal/financeiro) */
  scope_source?: "auvo" | "omie";
  auvo_requester_name?: string;
  auvo_supervisor_name?: string;
  auvo_coordinator_name?: string;
  /** Data escrita no texto do Auvo, quando diferente da data agendada */
  auvo_declared_date?: string;
};



type AuvoOrderEnrichment = {
  teamName?: string;
  technicianNames: string[];
  vesselName?: string;
  clientName?: string;
  scopeText?: string;
  locationText?: string;
  taskType?: string;
  checkinAt?: string;
};

const splitAuvoTeam = (teamName?: string | null): string[] => {
  if (!teamName) return [];
  return teamName
    .split(/\s+(?:e|E)\s+|[,/;+&]+/)
    .map((name) => name.trim())
    .filter(Boolean);
};

const addUnique = (items: string[], value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) return;
  if (!items.some((item) => item.toLocaleLowerCase("pt-BR") === normalized.toLocaleLowerCase("pt-BR"))) {
    items.push(normalized);
  }
};

const parseCalendarDate = (dateString?: string | null): Date => {
  if (!dateString) return new Date();
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0);
};

const normalizeText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

/** Trabalho interno (bancada/laboratório/oficina) não ocupa a agenda dos técnicos. */
const INTERNAL_WORK_MARKERS = ["BANCADA", "LABORATORIO", "OFICINA", "INTERNO", "INTERNA"];

const isInternalWorkType = (taskType?: string | null): boolean => {
  const normalized = normalizeText(taskType);
  if (!normalized) return false;
  return INTERNAL_WORK_MARKERS.some((marker) => normalized.includes(marker));
};

const auvoOrderDateKey = (serviceOrderId: string, taskDate?: string | null) =>
  `${serviceOrderId}|${(taskDate ?? "").slice(0, 10)}`;


export interface ServiceCalendarProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const ServiceCalendar = ({ 
  isExpanded = false, 
  onToggleExpanded,
  isFullscreen = false,
  onToggleFullscreen
}: ServiceCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedAuvoEvent, setSelectedAuvoEvent] = useState<CalendarServiceOrder | null>(null);
  const [overflowDay, setOverflowDay] = useState<Date | null>(null);
  const [selectedScheduleEntry, setSelectedScheduleEntry] = useState<ScheduleEntry | null>(null);
  const [serviceOrders, setServiceOrders] = useState<CalendarServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | undefined>();
  const [activeCategories, setActiveCategories] = useState<CalendarCategory[]>(CALENDAR_CATEGORIES);
  const { toast } = useToast();

  const toggleCategory = (category: CalendarCategory) => {
    setActiveCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };


  // Fetch absences and on-calls for the calendar
  const { absences, onCalls, isLoading: scheduleLoading } = useCalendarAbsences(currentDate, companyId);

  useEffect(() => {
    fetchServiceOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, view]);

  const fetchServiceOrders = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);

      // Compute date range around current view (±45 days is enough for month view)
      const rangeStart = new Date(currentDate);
      rangeStart.setDate(rangeStart.getDate() - 45);
      const rangeEnd = new Date(currentDate);
      rangeEnd.setDate(rangeEnd.getDate() + 45);
      const startStr = format(rangeStart, "yyyy-MM-dd");
      const endStr = format(rangeEnd, "yyyy-MM-dd");

      const { data: orders, error } = await supabase
        .from("service_orders")
        .select(`
          id,
          order_number,
          status,
          scheduled_date,
          service_date_time,
          description,
          location,
          vessels:vessel_id (name),
          clients:client_id (name),
          supervisor:profiles!supervisor_id (full_name),
          tasks (
            id,
            title,
            task_type:task_types (name),
            assigned_to:technicians (
              id,
              user:profiles!technicians_user_id_fkey (full_name)
            )
          )
        `)
        .eq("company_id", profile.company_id)
        .not("scheduled_date", "is", null)
        .gte("scheduled_date", startStr)
        .lte("scheduled_date", endStr)
        .order("service_date_time", { ascending: true });

      if (error) {
        console.error("Error fetching service orders:", error);
        setServiceOrders([]);
        return;
      }

      const orderIds = (orders || []).map((o: any) => o.id);
      // Batch-fetch initial visits + technicians in ONE query (no N+1)
      let visitsByOrder = new Map<string, any>();
      if (orderIds.length > 0) {
        const { data: visits } = await supabase
          .from("service_visits")
          .select(`
            service_order_id,
            visit_number,
            visit_type,
            visit_technicians (
              is_lead,
              technicians (
                id,
                profiles:user_id (full_name)
              )
            )
          `)
          .in("service_order_id", orderIds)
          .eq("visit_type", "initial");
        (visits || []).forEach((v: any) => {
          const existing = visitsByOrder.get(v.service_order_id);
          if (!existing || (v.visit_number || 0) < (existing.visit_number || 0)) {
            visitsByOrder.set(v.service_order_id, v);
          }
        });
      }

      const auvoByOrder = await fetchAuvoOrderEnrichment(orderIds);

      const formattedOrders: CalendarServiceOrder[] = (orders || []).map((order: any) => {
        // OSs sem horário definido (ex.: espelhadas do Omie/Auvo) usam meio-dia apenas
        // para posicionamento da data; o horário exibido fica vazio (sem "08:00" fictício)
        const scheduledDateTime = order.service_date_time
          ? new Date(order.service_date_time)
          : parseCalendarDate(order.scheduled_date);

        const visitData = visitsByOrder.get(order.id);
        const leadTech = visitData?.visit_technicians?.find((vt: any) => vt.is_lead);
        const auxiliaryTechs = visitData?.visit_technicians?.filter((vt: any) => !vt.is_lead) || [];
        const auvoEnrichment = auvoByOrder.get(auvoOrderDateKey(order.id, order.scheduled_date));

        const technicianNames: string[] = order.tasks
          ?.map((task: any) => task.assigned_to?.user?.full_name)
          .filter((name: any): name is string => Boolean(name)) || [];
        const uniqueTechNames: string[] = [...new Set(technicianNames)];
        const taskTypes = order.tasks?.map((task: any) => task.task_type?.name).filter(Boolean) || [];
        const auxiliaryNames: string[] = auxiliaryTechs
          .map((vt: any) => vt.technicians?.profiles?.full_name)
          .filter((name: any): name is string => Boolean(name));

        // Precedência: o Auvo tem escopo/embarcação/equipe/local; o Omie fica com
        // número da OS, cliente e dados fiscais/financeiros.
        const auvoCheckin = auvoEnrichment?.checkinAt ? new Date(auvoEnrichment.checkinAt) : null;
        const scheduledTime = order.service_date_time
          ? format(new Date(order.service_date_time), "HH:mm")
          : auvoCheckin
            ? format(auvoCheckin, "HH:mm")
            : "";

        return {
          id: order.id,
          order_number: order.order_number,
          vessel_name: auvoEnrichment?.vesselName || order.vessels?.name || "Sem embarcação",
          client_name: order.clients?.name || auvoEnrichment?.clientName,
          supervisor_name: order.supervisor?.full_name,
          status: order.status,
          scheduled_time: scheduledTime,
          scheduled_date: scheduledDateTime,
          task_type: auvoEnrichment?.taskType || taskTypes[0],
          description: auvoEnrichment?.scopeText || order.description,
          scope_source: auvoEnrichment?.scopeText ? ("auvo" as const) : ("omie" as const),
          location: auvoEnrichment?.locationText || order.location,
          technician_names: uniqueTechNames,
          lead_technician: leadTech?.technicians?.profiles?.full_name,
          auxiliary_technicians: auxiliaryNames,
          auvo_team_name: auvoEnrichment?.teamName,
          auvo_technician_names: auvoEnrichment?.technicianNames,
          auvo_vessel_name: auvoEnrichment?.vesselName,
          event_source: "arrow",
        };
      });

      const isQaOrder = (order: CalendarServiceOrder) =>
        /\[QA\]/i.test(order.vessel_name || "") || /\[QA\]/i.test(order.description || "");

      const orderDateById = new Map<string, string>(
        (orders || []).map((order: any) => [order.id, order.scheduled_date || ""]),
      );

      // O Auvo é a fonte da verdade da agenda: a OS só aparece se houver tarefa Auvo
      // vinculada na MESMA data (OS do Omie sem agendamento no Auvo fica fora).
      const hasAuvoOnDate = (order: CalendarServiceOrder) =>
        auvoByOrder.has(auvoOrderDateKey(order.id, orderDateById.get(order.id)));

      const auvoEvents = await fetchStandaloneAuvoEvents(profile.company_id, startStr, endStr, orderDateById);
      setServiceOrders([
        ...formattedOrders.filter(
          (order) => hasAuvoOnDate(order) && !isQaOrder(order) && !isInternalWorkType(order.task_type),
        ),
        ...auvoEvents,
      ]);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleEventClick = (eventId: string) => {
    const event = serviceOrders.find((item) => item.id === eventId);
    if (event?.event_source === "auvo") {
      setSelectedAuvoEvent(event);
      return;
    }
    setSelectedOrderId(eventId);
  };

  const fetchStandaloneAuvoEvents = async (
    targetCompanyId: string,
    startStr: string,
    endStr: string,
    orderDateById: Map<string, string>,
  ): Promise<CalendarServiceOrder[]> => {
    const { data, error } = await (supabase.from("auvo_tasks") as any)
      .select(`
        id,
        service_order_id,
        order_number,
        auvo_task_type,
        auvo_status,
        customer_name,
        vessel_name,
        vessel_name_parsed,
        client_name_parsed,
        team_name,
        technician_name,
        task_date,
        checkin_at,
        address,
        orientation,
        location_text,
        scope_text,
        requester_name,
        supervisor_name,
        coordinator_name

      `)
      .eq("company_id", targetCompanyId)
      .not("task_date", "is", null)
      .gte("task_date", startStr)
      .lte("task_date", endStr)
      .order("task_date", { ascending: true })
      .limit(5000);

    if (error) {
      console.error("Error fetching standalone Auvo events:", error);
      return [];
    }

    const grouped = new Map<string, CalendarServiceOrder>();

    (data || [])
      .filter((task: any) => !isInternalWorkType(task.auvo_task_type))
      .filter((task: any) => !task.service_order_id || orderDateById.get(task.service_order_id) !== task.task_date)
      .forEach((task: any) => {
        const scheduledDate = task.checkin_at
          ? new Date(task.checkin_at)
          : parseCalendarDate(task.task_date);
        const vesselName = task.vessel_name_parsed?.trim() || task.vessel_name?.trim() || "Agenda Auvo";
        const teamNames: string[] = [];
        splitAuvoTeam(task.team_name).forEach((name) => addUnique(teamNames, name));
        addUnique(teamNames, task.technician_name);
        const groupKey = task.service_order_id
          ? `order:${task.service_order_id}:${task.task_date}`
          : task.order_number?.trim()
            ? `os:${task.order_number.trim()}:${task.task_date}`
            : `task:${task.id}`;

        const existing = grouped.get(groupKey);
        if (existing) {
          teamNames.forEach((name) => addUnique(existing.auvo_technician_names || [], name));
          if (!existing.auvo_team_name && task.team_name) existing.auvo_team_name = task.team_name;
          if (!existing.description && (task.scope_text || task.orientation)) {
            existing.description = task.scope_text || task.orientation;
          }
          return;
        }

        grouped.set(groupKey, {
          id: `auvo:${task.id}`,
          order_number: task.order_number?.trim() || "Auvo",
          vessel_name: vesselName,
          client_name: task.client_name_parsed?.trim() || task.customer_name?.trim(),
          status: "auvo",
          scheduled_time: task.checkin_at ? format(new Date(task.checkin_at), "HH:mm") : "",
          scheduled_date: scheduledDate,
          task_type: task.auvo_task_type || "Agenda Auvo",
          description: task.scope_text || task.orientation,
          location: task.location_text || task.address,
          auvo_team_name: task.team_name,
          auvo_technician_names: teamNames,
          auvo_vessel_name: vesselName,
          event_source: "auvo",
          auvo_task_uid: task.id,
          auvo_status: task.auvo_status,
          linked_service_order_id: task.service_order_id || undefined,
          auvo_requester_name: task.requester_name?.trim() || undefined,
          auvo_supervisor_name: task.supervisor_name?.trim() || undefined,
          auvo_coordinator_name: task.coordinator_name?.trim() || undefined,
          auvo_declared_date: extractDeclaredDate(task.orientation, task.task_date),
        });

      });

    return Array.from(grouped.values());
  };

  const fetchAuvoOrderEnrichment = async (orderIds: string[]): Promise<Map<string, AuvoOrderEnrichment>> => {
    const enrichmentByOrder = new Map<string, AuvoOrderEnrichment>();
    if (orderIds.length === 0) return enrichmentByOrder;

    const chunks: string[][] = [];
    for (let index = 0; index < orderIds.length; index += 80) {
      chunks.push(orderIds.slice(index, index + 80));
    }

    const responses = await Promise.all(
      chunks.map((chunk) =>
        (supabase.from("auvo_tasks") as any)
          .select(
            "service_order_id, team_name, technician_name, vessel_name_parsed, vessel_name, client_name_parsed, customer_name, scope_text, orientation, location_text, address, auvo_task_type, checkin_at, task_date",
          )
          .in("service_order_id", chunk)
          .order("task_date", { ascending: false })
          .limit(5000),
      ),
    );

    responses.forEach(({ data, error }: any) => {
      if (error) {
        console.error("Error fetching Auvo calendar enrichment:", error);
        return;
      }

      (data || []).forEach((row: any) => {
        const serviceOrderId = row.service_order_id;
        if (!serviceOrderId || !row.task_date) return;

        // Indexado por OS + data: o cartão da agenda só usa a tarefa daquele dia.
        const key = auvoOrderDateKey(serviceOrderId, row.task_date);
        const existing = enrichmentByOrder.get(key) || { technicianNames: [] };
        const teamName = row.team_name?.trim();
        const vesselName = row.vessel_name_parsed?.trim() || row.vessel_name?.trim();

        if (teamName && !existing.teamName) {
          existing.teamName = teamName;
        }
        splitAuvoTeam(teamName).forEach((name) => addUnique(existing.technicianNames, name));
        addUnique(existing.technicianNames, row.technician_name);

        if (vesselName && !existing.vesselName) {
          existing.vesselName = vesselName;
        }

        // Auvo é a fonte da verdade operacional: escopo, local, tipo e horário real
        const scopeText = row.scope_text?.trim() || row.orientation?.trim();
        if (scopeText && !existing.scopeText) existing.scopeText = scopeText;
        const locationText = row.location_text?.trim() || row.address?.trim();
        if (locationText && !existing.locationText) existing.locationText = locationText;
        const clientName = row.client_name_parsed?.trim() || row.customer_name?.trim();
        if (clientName && !existing.clientName) existing.clientName = clientName;
        const taskType = row.auvo_task_type?.trim();
        if (taskType && !existing.taskType) existing.taskType = taskType;
        if (row.checkin_at && !existing.checkinAt) existing.checkinAt = row.checkin_at;

        enrichmentByOrder.set(key, existing);
      });
    });

    return enrichmentByOrder;
  };

  const handleSearch = () => {
    toast({
      title: "Buscar Serviços",
      description: "Funcionalidade de busca será implementada em breve.",
    });
    setIsSearchOpen(false);
  };

  const handleHelp = () => {
    toast({
      title: "Ajuda",
      description: "O guia de ajuda será implementado em breve.",
    });
    setIsHelpOpen(false);
  };

  const handleSettings = () => {
    toast({
      title: "Configurações",
      description: "As configurações serão implementadas em breve.",
    });
    setIsSettingsOpen(false);
  };

  const handleMenu = () => {
    toast({
      title: "Menu",
      description: "Opções adicionais serão implementadas em breve.",
    });
    setIsMenuOpen(false);
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background rounded-lg shadow overflow-visible",
      isFullscreen && "fixed inset-0 z-50 p-6"
    )}>
      <div className="flex items-center justify-between mb-4">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onDateChange={setCurrentDate}
          onSearchClick={handleSearch}
          onHelpClick={handleHelp}
          onSettingsClick={handleSettings}
          onMenuClick={handleMenu}
        />
        {onToggleFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFullscreen}
            className="ml-4"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Sair da Tela Cheia
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Tela Cheia
              </>
            )}
          </Button>
        )}
      </div>

      <CalendarLegend activeCategories={activeCategories} onToggleCategory={toggleCategory} />

      {view === "day" && (
        <DayView 
          date={currentDate} 
          orders={serviceOrders} 
          absences={absences}
          onCalls={onCalls}
          activeCategories={activeCategories}
          onEventClick={handleEventClick} 
        />
      )}
      {view === "week" && (
        <WeekView 
          date={currentDate} 
          orders={serviceOrders} 
          absences={absences}
          onCalls={onCalls}
          activeCategories={activeCategories}
          onEventClick={handleEventClick} 
          onScheduleEntryClick={setSelectedScheduleEntry}
          onDayOverflowClick={setOverflowDay}
        />
      )}
      {view === "month" && (
        <MonthView 
          date={currentDate} 
          orders={serviceOrders} 
          absences={absences}
          onCalls={onCalls}
          isExpanded={isExpanded || isFullscreen} 
          activeCategories={activeCategories}
          onEventClick={handleEventClick} 
          onScheduleEntryClick={setSelectedScheduleEntry}
          onDayOverflowClick={setOverflowDay}
        />
      )}


      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar Serviços</DialogTitle>
          </DialogHeader>
          <p>Funcionalidade em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuda</DialogTitle>
          </DialogHeader>
          <p>Guia de ajuda em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <p>Configurações em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <p>Menu em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(overflowDay)} onOpenChange={(open) => !open && setOverflowDay(null)}>
        {overflowDay && (
          <DayEventsDialog
            date={overflowDay}
            orders={serviceOrders}
            absences={absences}
            onCalls={onCalls}
            activeCategories={activeCategories}

            onOrderClick={(orderId) => {
              setOverflowDay(null);
              handleEventClick(orderId);
            }}
            onScheduleEntryClick={(entry) => {
              setOverflowDay(null);
              setSelectedScheduleEntry(entry);
            }}
          />
        )}
      </Dialog>

      <Dialog open={Boolean(selectedOrderId)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        {selectedOrderId && <ViewOrderDetailsDialog orderId={selectedOrderId} />}
      </Dialog>

      <Dialog
        open={Boolean(selectedScheduleEntry)}
        onOpenChange={(open) => !open && setSelectedScheduleEntry(null)}
      >
        {selectedScheduleEntry && <ScheduleEntryDetailsDialog entry={selectedScheduleEntry} />}
      </Dialog>

      <Dialog open={Boolean(selectedAuvoEvent)} onOpenChange={(open) => !open && setSelectedAuvoEvent(null)}>
        {selectedAuvoEvent && <AuvoTaskDetailsDialog event={selectedAuvoEvent} />}
      </Dialog>
    </div>
  );
};
