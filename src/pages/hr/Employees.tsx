import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeDetailSheet } from "@/components/hr/EmployeeDetailSheet";

const ROLE_LABELS: Record<string, string> = {
  technician: "Técnico",
  coordinator: "Coordenador",
  hr: "RH",
  commercial: "Comercial",
  director: "Diretor",
  compras: "Suprimentos",
  qualidade: "Qualidade",
  financeiro: "Financeiro",
  super_admin: "Administrador",
};

interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  company_id: string;
  department_id: string | null;
  created_at: string;
  department?: { name: string } | null;
  roles: string[];
}

export default function Employees() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);

  // Get current user's company
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      return data;
    },
  });

  // Fetch all employees in company
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone, company_id, department_id, created_at, department:departments(name)")
        .eq("company_id", profile!.company_id!)
        .order("full_name");
      if (error) throw error;

      // Fetch roles for all users
      const userIds = (profiles || []).map((p: any) => p.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, string[]> = {};
      (roles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        department: Array.isArray(p.department) ? p.department[0] : p.department,
        roles: roleMap[p.id] || [],
      })) as EmployeeRow[];
    },
  });

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch = !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || e.roles.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [employees, search, roleFilter]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => e.roles.forEach((r) => set.add(r)));
    return Array.from(set).sort();
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground text-sm">{employees.length} colaboradores na empresa</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Cargo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cargos</SelectItem>
            {uniqueRoles.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Colaborador</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Cargo</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Departamento</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Desde</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{emp.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {emp.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-xs">{ROLE_LABELS[r] || r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                      {emp.department?.name || "—"}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                      {new Date(emp.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedEmployee(emp)}>
                        Ver ficha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailSheet
          employee={selectedEmployee}
          open={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
