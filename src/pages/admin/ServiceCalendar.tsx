import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type ServiceOrder = {
  id: string;
  order_number: string;
  scheduled_date: string | null;
  status: string;
  vessel?: { name: string };
  client?: { name: string };
};

const ServiceCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [vessel, setVessel] = useState("all-vessels");
  const [technician, setTechnician] = useState("all-technicians");
  const [serviceType, setServiceType] = useState("");
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [vessel, technician]);

  const fetchData = async () => {
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

      // Fetch service orders
      let ordersQuery = supabase
        .from("service_orders")
        .select("id, order_number, scheduled_date, status, vessel:vessels(name), client:clients(name)")
        .eq("company_id", profile.company_id)
        .not("scheduled_date", "is", null)
        .order("scheduled_date", { ascending: true });

      if (vessel && vessel !== "all-vessels") {
        ordersQuery = ordersQuery.eq("vessel_id", vessel);
      }

      const { data: orders } = await ordersQuery;
      setServiceOrders(orders || []);

      // Fetch vessels
      const { data: vesselsData } = await supabase
        .from("vessels")
        .select("id, name, client:clients!inner(company_id)")
        .eq("client.company_id", profile.company_id);
      setVessels(vesselsData || []);

      // Fetch technicians
      const { data: techsData } = await supabase
        .from("technicians")
        .select("id, user:profiles!inner(full_name)")
        .eq("company_id", profile.company_id)
        .eq("active", true);
      setTechnicians(techsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = () => {
    navigate("/admin/service-orders");
  };

  const getOrdersForDate = (selectedDate: Date) => {
    return serviceOrders.filter((order) => {
      if (!order.scheduled_date) return false;
      const orderDate = new Date(order.scheduled_date);
      return (
        orderDate.getDate() === selectedDate.getDate() &&
        orderDate.getMonth() === selectedDate.getMonth() &&
        orderDate.getFullYear() === selectedDate.getFullYear()
      );
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h2>
      <Button onClick={handleCreateService}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Calendário de Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
            
            {date && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Serviços agendados para {date.toLocaleDateString("pt-BR")}
                </h3>
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : getOrdersForDate(date).length > 0 ? (
                  <div className="space-y-3">
                    {getOrdersForDate(date).map((order) => (
                      <div
                        key={order.id}
                        className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                        onClick={() => navigate(`/admin/service-orders`)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{order.order_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.vessel?.name || "Sem embarcação"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.client?.name || "Sem cliente"}
                            </p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum serviço agendado para esta data.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label>Embarcação</label>
              <Select value={vessel} onValueChange={setVessel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-vessels">Todas</SelectItem>
                  {vessels.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label>Técnico</label>
              <Select value={technician} onValueChange={setTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-technicians">Todos</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.user?.full_name || "Sem nome"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceCalendar;