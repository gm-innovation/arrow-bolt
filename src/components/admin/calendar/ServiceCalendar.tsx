import { useState, useEffect } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
};

export const ServiceCalendar = () => {
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
          supervisor:technicians!supervisor_id (
            user:profiles!inner (full_name)
          ),
          tasks (
            id,
            title,
            task_type:task_types (name),
            assigned_to:technicians (
              user:profiles!inner (full_name)
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

      const formattedOrders: CalendarServiceOrder[] = (orders || []).map((order: any) => {
        const scheduledDateTime = order.service_date_time 
          ? new Date(order.service_date_time)
          : new Date(order.scheduled_date + "T08:00:00");

        const technicianNames = order.tasks
          ?.map((task: any) => task.assigned_to?.user?.full_name)
          .filter(Boolean) || [];

        const taskTypes = order.tasks
          ?.map((task: any) => task.task_type?.name)
          .filter(Boolean) || [];

        return {
          id: order.id,
          order_number: order.order_number,
          vessel_name: order.vessels?.name || "Sem embarcação",
          client_name: order.clients?.name,
          supervisor_name: order.supervisor?.user?.full_name,
          status: order.status,
          scheduled_time: format(scheduledDateTime, "HH:mm"),
          scheduled_date: scheduledDateTime,
          task_type: taskTypes[0],
          description: order.description,
          location: order.location,
          technician_names: technicianNames,
        };
      });

      setServiceOrders(formattedOrders);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (orderId: string) => {
    const order = serviceOrders.find(o => o.id === orderId);
    if (order) {
      toast({
        title: "Detalhes do Serviço",
        description: `${order.order_number} - ${order.vessel_name}`,
      });
    }
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
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
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
      
      {view === "day" && (
        <DayView date={currentDate} orders={serviceOrders} onEventClick={handleEventClick} />
      )}
      {view === "week" && (
        <WeekView date={currentDate} orders={serviceOrders} onEventClick={handleEventClick} />
      )}
      {view === "month" && (
        <MonthView date={currentDate} orders={serviceOrders} />
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