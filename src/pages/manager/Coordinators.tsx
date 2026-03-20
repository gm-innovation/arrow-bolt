import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Coordinators = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { data: coordinators, isLoading } = useQuery({
    queryKey: ["coordinators"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!currentProfile?.company_id) return [];

      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coordinator");

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .eq("company_id", currentProfile.company_id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const coordinatorsWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: orders } = await supabase
            .from("service_orders")
            .select("id, status")
            .eq("created_by", profile.id);

          const total = orders?.length || 0;
          const completed = orders?.filter(o => o.status === "completed").length || 0;
          const inProgress = orders?.filter(o => o.status === "in_progress").length || 0;
          const pending = orders?.filter(o => o.status === "pending").length || 0;

          return {
            ...profile,
            stats: { total, completed, inProgress, pending }
          };
        })
      );

      return coordinatorsWithStats;
    }
  });

  const filteredCoordinators = coordinators?.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Coordenadores</h2>
          <p className="text-muted-foreground">Visualize o desempenho de cada coordenador</p>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Coordenadores</h2>
        <p className="text-muted-foreground">Visualize o desempenho de cada coordenador</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar coordenador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Total OSs</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Em Andamento</TableHead>
                <TableHead className="text-center">Pendentes</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!filteredCoordinators || filteredCoordinators.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32">
                    <div className="flex flex-col items-center justify-center">
                      <User className="h-12 w-12 text-muted-foreground mb-3 opacity-30" />
                      <p className="text-muted-foreground">Nenhum coordenador encontrado</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {searchTerm ? "Tente buscar por outro termo" : "Não há coordenadores cadastrados na sua empresa"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoordinators.map((coordinator) => (
                  <TableRow key={coordinator.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {coordinator.full_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{coordinator.email}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{coordinator.stats.total}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-green-600 border-green-200">{coordinator.stats.completed}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200">{coordinator.stats.inProgress}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-gray-600 border-gray-200">{coordinator.stats.pending}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/manager/dashboard", { state: { coordinatorId: coordinator.id } })}
                      >
                        Ver Detalhes
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

export default Coordinators;
