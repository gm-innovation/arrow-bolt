import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const ServiceTransfers = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      // Fetch service history with technician transfer actions
      const { data, error } = await supabase
        .from("service_history")
        .select(`
          *,
          service_orders:service_order_id (
            order_number,
            vessels:vessel_id (name),
            clients:client_id (name)
          ),
          profiles:performed_by (full_name)
        `)
        .eq("action", "technician_transfer")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter by company through service orders
      const filteredData = data?.filter((transfer: any) => 
        transfer.service_orders !== null
      ) || [];

      setTransfers(filteredData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar transferências",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter((transfer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transfer.service_orders?.order_number?.toLowerCase().includes(searchLower) ||
      transfer.service_orders?.vessels?.name?.toLowerCase().includes(searchLower) ||
      transfer.service_orders?.clients?.name?.toLowerCase().includes(searchLower) ||
      transfer.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Histórico de Transferências
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transferências Realizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Buscar por OS, embarcação, cliente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Número OS</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Realizado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm 
                          ? "Nenhuma transferência encontrada com os critérios de busca"
                          : "Nenhuma transferência registrada ainda"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(transfer.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transfer.service_orders?.order_number || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transfer.service_orders?.clients?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {transfer.service_orders?.vessels?.name || "N/A"}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm truncate" title={transfer.description}>
                            {transfer.description || "Sem descrição"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {transfer.profiles?.full_name || "Sistema"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceTransfers;