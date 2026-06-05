import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import DeviceRegisterTable from "@/components/quality/DeviceRegisterTable";
import DeviceFormDialog from "@/components/quality/DeviceFormDialog";
import { useQualityDevices, type DeviceStatus, type DeviceCriticality } from "@/hooks/useQualityDevices";

const QualityDevicesPage = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus | "all">("all");
  const [criticality, setCriticality] = useState<DeviceCriticality | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { items } = useQualityDevices({ search, status, criticality });
  const today = new Date();
  const overdue = items.filter((d) => d.next_calibration_due && new Date(d.next_calibration_due) < today);
  const outOfService = items.filter((d) => d.status === "out_of_service" || d.status === "retired");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Calibração — Instrumentos de Medição</h2>
          <p className="text-muted-foreground">ISO 9001 §7.1.5 — inventário, calibrações e certificados.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo instrumento
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código ou nome..." className="pl-8"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="in_calibration">Em calibração</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="out_of_service">Fora de serviço</SelectItem>
            <SelectItem value="retired">Aposentado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticality} onValueChange={(v: any) => setCriticality(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Criticidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas criticidades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Inventário ({items.length})</TabsTrigger>
          <TabsTrigger value="overdue">Vencidos ({overdue.length})</TabsTrigger>
          <TabsTrigger value="out">Fora/Aposentados ({outOfService.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DeviceRegisterTable devices={items} />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <DeviceRegisterTable devices={overdue} emptyText="Nenhuma calibração vencida." />
        </TabsContent>
        <TabsContent value="out" className="mt-4">
          <DeviceRegisterTable devices={outOfService} emptyText="Nenhum instrumento fora de serviço." />
        </TabsContent>
      </Tabs>

      <DeviceFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};

export default QualityDevicesPage;
