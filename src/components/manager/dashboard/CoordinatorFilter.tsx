import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CoordinatorFilterProps {
  selectedCoordinator: string | null;
  onCoordinatorChange: (coordinatorId: string | null) => void;
}

export const CoordinatorFilter = ({ selectedCoordinator, onCoordinatorChange }: CoordinatorFilterProps) => {
  const { data: coordinators } = useQuery({
    queryKey: ["coordinators-filter"],
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

      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;
      if (!adminRoles || adminRoles.length === 0) return [];

      const userIds = adminRoles.map(r => r.user_id);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
        .eq("company_id", currentProfile.company_id)
        .order("full_name");

      if (profilesError) throw profilesError;
      return profiles || [];
    }
  });

  return (
    <Select
      value={selectedCoordinator || "all"}
      onValueChange={(value) => onCoordinatorChange(value === "all" ? null : value)}
    >
      <SelectTrigger className="w-full md:w-64">
        <SelectValue placeholder="Filtrar por coordenador" />
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
  );
};
