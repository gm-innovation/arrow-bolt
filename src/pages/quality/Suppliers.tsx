import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import SupplierRegisterTable from "@/components/quality/SupplierRegisterTable";
import SupplierFormDialog from "@/components/quality/SupplierFormDialog";
import { useQualitySuppliers, type SupplierCategory, type SupplierStatus } from "@/hooks/useQualitySuppliers";

const QualitySuppliersPage = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<SupplierCategory | "all">("all");
  const [status, setStatus] = useState<SupplierStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { items } = useQualitySuppliers({ search, category, status });
  const today = new Date();
  const overdue = items.filter((s) => s.next_evaluation_due && new Date(s.next_evaluation_due) < today);
  const open = items.filter((s) => s.status === "approved" || s.status === "conditional");
  const suspended = items.filter((s) => s.status === "suspended" || s.status === "disqualified");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Provedores Externos</h2>
          <p className="text-muted-foreground">ISO 9001 §8.4 — qualificação, avaliação e lista de aprovados.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo fornecedor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={(v: any) => setCategory(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="material">Material</SelectItem>
            <SelectItem value="service">Serviço</SelectItem>
            <SelectItem value="calibration">Calibração</SelectItem>
            <SelectItem value="training">Treinamento</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="logistics">Logística</SelectItem>
            <SelectItem value="other">Outros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="conditional">Condicional</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="disqualified">Desqualificado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Lista ({items.length})</TabsTrigger>
          <TabsTrigger value="overdue">Reavaliação vencida ({overdue.length})</TabsTrigger>
          <TabsTrigger value="active">Aprovados/Condicionais ({open.length})</TabsTrigger>
          <TabsTrigger value="suspended">Suspensos/Desqualificados ({suspended.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <SupplierRegisterTable suppliers={items} />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <SupplierRegisterTable suppliers={overdue} emptyText="Nenhuma reavaliação vencida." />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <SupplierRegisterTable suppliers={open} />
        </TabsContent>
        <TabsContent value="suspended" className="mt-4">
          <SupplierRegisterTable suppliers={suspended} emptyText="Nenhum fornecedor suspenso." />
        </TabsContent>
      </Tabs>

      <SupplierFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
};

export default QualitySuppliersPage;
