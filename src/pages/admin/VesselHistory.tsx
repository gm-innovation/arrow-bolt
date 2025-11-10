import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VesselHistory = () => {
  const [vesselName, setVesselName] = useState("");
  const [company, setCompany] = useState("all-clients");
  const [vesselType, setVesselType] = useState("all-types");
  const [vessels, setVessels] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [vesselName, company, vesselType]);

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

      // Fetch vessels
      let query = supabase
        .from("vessels")
        .select(`
          *,
          client:clients!inner(name, company_id),
          service_orders(id)
        `)
        .eq("client.company_id", profile.company_id);

      if (vesselName) {
        query = query.ilike("name", `%${vesselName}%`);
      }

      if (company && company !== "all-clients") {
        query = query.eq("client_id", company);
      }

      if (vesselType && vesselType !== "all-types") {
        query = query.eq("vessel_type", vesselType);
      }

      const { data: vesselsData } = await query;
      setVessels(vesselsData || []);

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profile.company_id);
      setClients(clientsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVessel = () => {
    navigate("/admin/clients");
  };

  const handleViewHistory = (vesselId: string) => {
    navigate("/admin/service-history");
  };

  const handleEdit = (vesselId: string) => {
    navigate("/admin/clients");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Histórico de Embarcações
        </h2>
        <Button onClick={handleCreateVessel}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Embarcação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label>Nome da Embarcação</label>
              <Input
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                placeholder="Buscar por nome..."
              />
            </div>
            <div className="space-y-2">
              <label>Empresa</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-clients">Todos</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Tipo de Embarcação</label>
              <Select value={vesselType} onValueChange={setVesselType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="cargo">Carga</SelectItem>
                  <SelectItem value="passenger">Passageiros</SelectItem>
                  <SelectItem value="tanker">Tanque</SelectItem>
                  <SelectItem value="container">Container</SelectItem>
                  <SelectItem value="bulk_carrier">Graneleiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Serviços Realizados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : vessels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhuma embarcação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                vessels.map((vessel) => (
                  <TableRow key={vessel.id}>
                    <TableCell className="font-medium">{vessel.name}</TableCell>
                    <TableCell>{vessel.vessel_type || "N/A"}</TableCell>
                    <TableCell>{vessel.client?.name || "N/A"}</TableCell>
                    <TableCell>{vessel.service_orders?.length || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewHistory(vessel.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(vessel.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VesselHistory;