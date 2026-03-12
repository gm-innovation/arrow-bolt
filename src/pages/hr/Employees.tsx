import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, Plus, Wrench } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmployeeDetailSheet } from "@/components/hr/EmployeeDetailSheet";
import { NewEmployeeForm, EmployeeFormValues } from "@/components/hr/NewEmployeeForm";
import { useToast } from "@/hooks/use-toast";
import { addDays } from "date-fns";
import { sanitizeFileName } from "@/lib/utils";

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

export interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  company_id: string;
  created_at: string;
  roles: string[];
  technician?: {
    id: string;
    specialty: string | null;
    aso_valid_until: string | null;
    active: boolean;
    cpf: string | null;
    rg: string | null;
    birth_date: string | null;
    gender: string | null;
    nationality: string | null;
    height: number | null;
    blood_type: string | null;
    blood_rh_factor: string | null;
    medical_status: string | null;
  } | null;
}

const getAsoStatus = (asoDate?: string | null) => {
  if (!asoDate) return { label: "—", variant: "secondary" as const };
  const date = new Date(asoDate);
  const today = new Date();
  const thirtyDays = addDays(today, 30);
  if (date < today) return { label: "Vencido", variant: "destructive" as const };
  if (date <= thirtyDays) return { label: "A vencer", variant: "secondary" as const };
  return { label: "Válido", variant: "default" as const };
};

export default function Employees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRow | null>(null);
  const [isNewTechOpen, setIsNewTechOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["hr-employees", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, phone, company_id, created_at")
        .eq("company_id", profile!.company_id!)
        .order("full_name");
      if (error) throw error;

      const userIds = (profiles || []).map((p: any) => p.id);

      // Fetch roles and technician data in parallel
      const [rolesRes, techRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        supabase.from("technicians").select("id, user_id, specialty, aso_valid_until, active, cpf, rg, birth_date, gender, nationality, height, blood_type, blood_rh_factor, medical_status").eq("company_id", profile!.company_id!),
      ]);

      const roleMap: Record<string, string[]> = {};
      (rolesRes.data || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const techMap: Record<string, any> = {};
      (techRes.data || []).forEach((t: any) => {
        techMap[t.user_id] = t;
      });

      return (profiles || []).map((p: any) => ({
        ...p,
        roles: roleMap[p.id] || [],
        technician: techMap[p.id] || null,
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

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleCreateEmployee = async (
    data: EmployeeFormValues,
    uploadedFile: File | null,
    photoFile: File | null,
    certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string }>
  ) => {
    try {
      const companyId = profile?.company_id;
      if (!companyId) throw new Error("Company not found");

      let password = '';
      if (data.password_option === 'auto_email' || data.password_option === 'reset_link') {
        password = generateSecurePassword();
      } else {
        password = data.password;
      }

      const { data: existingUser } = await supabase
        .from("profiles").select("email").eq("email", data.email).maybeSingle();
      if (existingUser) {
        toast({ title: "Erro", description: "Já existe um usuário com este email", variant: "destructive" });
        return;
      }

      const { data: createUserResult, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: { email: data.email, password, full_name: data.name, phone: data.phone || null, company_id: companyId, role: data.selected_role }
      });
      if (createUserError) throw createUserError;
      if (!createUserResult?.user_id) throw new Error('Falha ao criar usuário');

      if (photoFile) {
        try {
          const photoExt = photoFile.name.split('.').pop();
          const timestamp = Date.now();
          const photoPath = `${createUserResult.user_id}/avatar-${timestamp}.${photoExt}`;
          const { error: uploadError } = await supabase.storage.from('technician-avatars').upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type, cacheControl: '0' });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('technician-avatars').getPublicUrl(photoPath);
            await supabase.from('profiles').update({ avatar_url: `${publicUrl}?v=${timestamp}` }).eq('id', createUserResult.user_id);
          }
        } catch (e) { console.error('Photo upload error:', e); }
      }

      // Only process technician-specific data if role is technician
      if (data.selected_role === 'technician') {
        const { data: technicianData, error: techError } = await supabase
          .from('technicians').select('id').eq('user_id', createUserResult.user_id).single();
        if (techError) throw techError;

        await supabase.from("technicians").update({
          specialty: data.specialty || null, cpf: data.cpf || null, rg: data.rg || null,
          birth_date: data.birth_date || null, gender: data.gender || null,
          nationality: data.nationality || null, height: data.height ? parseInt(data.height) : null,
          blood_type: data.blood_type || null, blood_rh_factor: data.blood_rh_factor || null,
          aso_valid_until: data.aso_valid_until || null, medical_status: data.medical_status || 'pending',
        }).eq('user_id', createUserResult.user_id);

        if (uploadedFile && technicianData) {
          const filePath = `${companyId}/${technicianData.id}/aso/${Date.now()}-${uploadedFile.name}`;
          const { error: uploadError } = await supabase.storage.from('technician-documents').upload(filePath, uploadedFile);
          if (!uploadError) {
            await supabase.from('technician_documents').insert({
              technician_id: technicianData.id, document_type: 'aso', file_name: uploadedFile.name,
              file_path: filePath, issue_date: data.aso_issue_date || null, expiry_date: data.aso_valid_until || null,
              metadata: data.aso_issue_date ? { aso_issue_date: data.aso_issue_date } : null,
            });
          }
        }

        if (certificationFiles.length > 0 && technicianData) {
          for (let i = 0; i < certificationFiles.length; i++) {
            const cert = certificationFiles[i];
            const sanitizedName = sanitizeFileName(cert.file.name);
            const certPath = `${companyId}/${technicianData.id}/certifications/${Date.now()}-${i}-${sanitizedName}`;
            const { error: certError } = await supabase.storage.from('technician-documents').upload(certPath, cert.file);
            if (!certError) {
              await supabase.from('technician_documents').insert({
                technician_id: technicianData.id, document_type: 'certification', file_name: cert.file.name,
                file_path: certPath, certificate_name: cert.name || cert.file.name,
                issue_date: cert.issueDate, expiry_date: cert.expiryDate,
              });
            }
          }
        }
      }


      if (data.password_option === 'reset_link') {
        await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${window.location.origin}/login` });
      }

      setIsNewTechOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });

      const passwordMessage = data.password_option === 'auto_email'
        ? `Senha gerada: ${password}. Informe ao colaborador.`
        : data.password_option === 'reset_link' ? 'Link de redefinição de senha enviado.' : 'Senha definida com sucesso.';

      toast({ title: "Colaborador criado com sucesso", description: `${data.name} foi adicionado. ${passwordMessage}` });
    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({ title: "Erro ao criar colaborador", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
          <p className="text-muted-foreground text-sm">{employees.length} colaboradores na empresa</p>
        </div>
        <Button onClick={() => setIsNewTechOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Colaborador
        </Button>
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
                  
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Especialidade</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">ASO</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Desde</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const aso = emp.technician ? getAsoStatus(emp.technician.aso_valid_until) : null;
                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{emp.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-foreground">{emp.full_name}</p>
                              {emp.technician && <Wrench className="h-3.5 w-3.5 text-muted-foreground" />}
                            </div>
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
                        {emp.technician?.specialty || "—"}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {aso ? (
                          <Badge variant={aso.variant} className="text-xs">{aso.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                  );
                })}
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

      <Dialog open={isNewTechOpen} onOpenChange={setIsNewTechOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
          </DialogHeader>
          <NewEmployeeForm
            onSubmit={handleCreateEmployee}
            onCancel={() => setIsNewTechOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
