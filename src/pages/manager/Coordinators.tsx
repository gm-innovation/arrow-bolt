import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ClipboardList, CheckCircle, Clock, XCircle, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const Coordinators = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const { data: coordinators, isLoading } = useQuery({
    queryKey: ["coordinators"],
    queryFn: async () => {
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!currentProfile?.company_id) return [];

      // Get all users with admin role
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "coordinator");

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map(r => r.user_id);

      // Get profiles for these users in the same company
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .eq("company_id", currentProfile.company_id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get stats for each coordinator
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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

      {(!filteredCoordinators || filteredCoordinators.length === 0) ? (
        <Card className="col-span-full">
          <CardContent className="py-10 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum coordenador encontrado</p>
            <p className="text-sm mt-2">
              {searchTerm ? "Tente buscar por outro termo" : "Não há coordenadores cadastrados na sua empresa"}
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCoordinators.map((coordinator) => (
          <Card key={coordinator.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {coordinator.full_name}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{coordinator.email}</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    <span>Total de OSs</span>
                  </div>
                  <span className="font-semibold">{coordinator.stats.total}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Concluídas</span>
                  </div>
                  <span className="font-semibold text-green-600">{coordinator.stats.completed}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span>Em Andamento</span>
                  </div>
                  <span className="font-semibold text-yellow-600">{coordinator.stats.inProgress}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-gray-500" />
                    <span>Pendentes</span>
                  </div>
                  <span className="font-semibold text-gray-600">{coordinator.stats.pending}</span>
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                variant="outline"
                onClick={() => navigate("/manager/dashboard", { state: { coordinatorId: coordinator.id } })}
              >
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
};

export default Coordinators;
