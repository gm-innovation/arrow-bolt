import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
};

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
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [serviceOrders, setServiceOrders] = useState<CalendarServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchServiceOrders();
  }, []);

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
        .order("service_date_time", { ascending: true });

      if (error) {
        console.error("Error fetching service orders:", error);
        return;
      }

      const formattedOrders: CalendarServiceOrder[] = await Promise.all(
        (orders || []).map(async (order: any) => {
          const scheduledDateTime = order.service_date_time 
            ? new Date(order.service_date_time)
            : new Date(order.scheduled_date + "T08:00:00");

          // Get visit technicians to determine lead/auxiliary
          const { data: visitData } = await supabase
            .from("service_visits")
            .select(`
              id,
              visit_technicians (
                technician_id,
                is_lead,
                technicians (
                  id,
                  profiles:user_id (full_name)
                )
              )
            `)
            .eq("service_order_id", order.id)
            .eq("visit_type", "initial")
            .order("visit_number", { ascending: true })
            .limit(1)
            .single();

          const leadTech = visitData?.visit_technicians?.find((vt: any) => vt.is_lead);
          const auxiliaryTechs = visitData?.visit_technicians?.filter((vt: any) => !vt.is_lead) || [];

          const technicianNames: string[] = order.tasks
            ?.map((task: any) => task.assigned_to?.user?.full_name)
            .filter((name): name is string => Boolean(name)) || [];

          const uniqueTechNames: string[] = [...new Set(technicianNames)];

          const taskTypes = order.tasks
            ?.map((task: any) => task.task_type?.name)
            .filter(Boolean) || [];

          const auxiliaryNames: string[] = auxiliaryTechs
            .map((vt: any) => vt.technicians?.profiles?.full_name)
            .filter((name): name is string => Boolean(name));

          return {
            id: order.id,
            order_number: order.order_number,
            vessel_name: order.vessels?.name || "Sem embarcação",
            client_name: order.clients?.name,
            supervisor_name: order.supervisor?.full_name,
            status: order.status,
            scheduled_time: format(scheduledDateTime, "HH:mm"),
            scheduled_date: scheduledDateTime,
            task_type: taskTypes[0],
            description: order.description,
            location: order.location,
            technician_names: uniqueTechNames,
            lead_technician: leadTech?.technicians?.profiles?.full_name,
            auxiliary_technicians: auxiliaryNames,
          };
        })
      );

      setServiceOrders(formattedOrders);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (orderId: string) => {
    navigate(`/admin/orders?id=${orderId}`);
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
      "flex flex-col h-full bg-white rounded-lg shadow overflow-visible",
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
      
      {view === "day" && (
        <DayView date={currentDate} orders={serviceOrders} onEventClick={handleEventClick} />
      )}
      {view === "week" && (
        <WeekView date={currentDate} orders={serviceOrders} onEventClick={handleEventClick} />
      )}
      {view === "month" && (
        <MonthView date={currentDate} orders={serviceOrders} isExpanded={isExpanded} onEventClick={handleEventClick} />
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
    </div>
  );
};