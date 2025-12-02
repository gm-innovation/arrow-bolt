import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface ManagerDashboardFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

export const ManagerDashboardFilters = ({ filters, onFiltersChange }: ManagerDashboardFiltersProps) => {
  const { user } = useAuth();
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);

  // Fetch coordinators
  const { data: coordinators } = useQuery({
    queryKey: ["coordinators-filter"],
    queryFn: async () => {
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (!adminRoles) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminRoles.map(r => r.user_id))
        .order("full_name");

      return profiles || [];
    }
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients-filter", user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return [];

      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profileData.company_id)
        .order("name");

      return data || [];
    },
    enabled: !!user?.id
  });

  const statusOptions = [
    { value: "pending", label: "Pendente" },
    { value: "in_progress", label: "Em Andamento" },
    { value: "completed", label: "Concluída" },
    { value: "cancelled", label: "Cancelada" },
  ];

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: DashboardFilters = { statuses: [] };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const toggleStatus = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const hasActiveFilters = 
    localFilters.startDate || 
    localFilters.endDate || 
    localFilters.statuses.length > 0 || 
    localFilters.clientId || 
    localFilters.coordinatorId;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Filtros Avançados</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Data Inicial */}
          <div className="space-y-2">
            <Label>Data Inicial</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.startDate ? format(localFilters.startDate, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.startDate}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data Final */}
          <div className="space-y-2">
            <Label>Data Final</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.endDate ? format(localFilters.endDate, "dd/MM/yyyy") : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.endDate}
                  onSelect={(date) => setLocalFilters(prev => ({ ...prev, endDate: date }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={localFilters.clientId || "all"}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ ...prev, clientId: value === "all" ? undefined : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os Clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coordenador */}
          <div className="space-y-2">
            <Label>Coordenador</Label>
            <Select
              value={localFilters.coordinatorId || "all"}
              onValueChange={(value) => 
                setLocalFilters(prev => ({ ...prev, coordinatorId: value === "all" ? undefined : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os Coordenadores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Coordenadores</SelectItem>
                {coordinators?.map((coordinator) => (
                  <SelectItem key={coordinator.id} value={coordinator.id}>
                    {coordinator.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status (Multiple Selection) */}
        <div className="space-y-2">
          <Label>Status</Label>
          <div className="flex flex-wrap gap-4">
            {statusOptions.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={status.value}
                  checked={localFilters.statuses.includes(status.value)}
                  onCheckedChange={() => toggleStatus(status.value)}
                />
                <label
                  htmlFor={status.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {status.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleApplyFilters}>
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </Card>
  );
};
