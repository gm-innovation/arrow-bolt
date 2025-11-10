import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NewTechnicianForm } from "@/components/admin/technicians/NewTechnicianForm";
import { Plus, Search, Download, Eye, Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { exportToCSV, formatBooleanForExport } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Technicians = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTechnicianOpen, setIsNewTechnicianOpen] = useState(false);
  const [isEditTechnicianOpen, setIsEditTechnicianOpen] = useState(false);
  const [isViewTechnicianOpen, setIsViewTechnicianOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const getValidityStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: 'unknown', color: 'bg-muted text-muted-foreground', label: 'Sem data' };
    
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'bg-destructive text-destructive-foreground', label: 'Vencido' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', color: 'bg-yellow-500 text-white', label: 'Próximo do vencimento' };
    } else {
      return { status: 'valid', color: 'bg-green-500 text-white', label: 'Válido' };
    }
  };

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from("technicians")
        .select(`
          *,
          profiles (
            id,
            full_name,
            email,
            phone,
            avatar_url
          ),
          technician_documents (
            id,
            file_name,
            certificate_name,
            issue_date,
            expiry_date,
            document_type,
            file_path
          )
        `)
        .eq("company_id", profileData.company_id)
        .eq("active", true);

      if (error) throw error;

      const formattedData = data?.map((tech: any) => {
        console.log('Tech profile data:', tech.profiles);
        console.log('Avatar URL:', tech.profiles?.avatar_url);
        return {
          id: tech.id,
          user_id: tech.user_id,
          userId: tech.profiles?.id,
          name: tech.profiles?.full_name || "",
          email: tech.profiles?.email || "",
          phone: tech.profiles?.phone || "",
          avatar_url: tech.profiles?.avatar_url || null,
          role: tech.specialty || "",
          isActive: tech.active,
          cpf: tech.cpf,
          rg: tech.rg,
          birth_date: tech.birth_date,
          gender: tech.gender,
          nationality: tech.nationality,
          height: tech.height,
          blood_type: tech.blood_type,
          blood_rh_factor: tech.blood_rh_factor,
          aso_valid_until: tech.aso_valid_until,
          medical_status: tech.medical_status,
          documents: tech.technician_documents || [],
        };
      }) || [];

      console.log('Formatted technicians:', formattedData);

      setTechnicians(formattedData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar técnicos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter technicians based on search term and status filter
  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tech.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && tech.isActive) || 
                         (statusFilter === "inactive" && !tech.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const uploadTechnicianDocuments = async (
    file: File, 
    technicianId: string, 
    companyId: string
  ) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${companyId}/${technicianId}/aso/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('technician-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Save metadata to database
    await supabase.from('technician_documents').insert({
      technician_id: technicianId,
      document_type: 'aso',
      file_name: file.name,
      file_path: filePath,
    });
  };

  const handleCreateTechnician = async (data: any, uploadedFile: File | null, photoFile: File | null, certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string; }>) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) throw new Error("Company not found");

      // Gerar senha baseado na opção escolhida
      let password = '';
      if (data.password_option === 'auto_email') {
        password = generateSecurePassword();
      } else if (data.password_option === 'manual') {
        password = data.password;
      } else {
        // reset_link: gera senha temporária
        password = generateSecurePassword();
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Erro",
          description: "Já existe um usuário com este email",
          variant: "destructive",
        });
        return;
      }

      // Criar usuário via edge function
      const { data: createUserResult, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: password,
          full_name: data.name,
          phone: data.phone || null,
          company_id: profileData.company_id,
          role: 'tech' // será convertido para 'technician' na edge function
        }
      });

      if (createUserError) {
        console.error("Create user error:", createUserError);
        throw createUserError;
      }
      if (!createUserResult?.user_id) throw new Error('Falha ao criar usuário');

      // Upload da foto se fornecida
      if (photoFile) {
        console.log('📸 Iniciando upload da foto...');
        console.log('- User ID:', createUserResult.user_id);
        console.log('- Arquivo:', photoFile.name);
        console.log('- Tamanho:', (photoFile.size / 1024).toFixed(2), 'KB');
        console.log('- Tipo:', photoFile.type);
        
        try {
          // Validar arquivo
          if (!photoFile.type.startsWith('image/')) {
            throw new Error('Arquivo deve ser uma imagem');
          }
          
          if (photoFile.size > 5 * 1024 * 1024) {
            throw new Error('Imagem muito grande (máx 5MB)');
          }
          
          const photoExt = photoFile.name.split('.').pop();
          const timestamp = Date.now();
          const photoPath = `${profileData.company_id}/${createUserResult.user_id}/avatar.${photoExt}`;
          
          console.log('📍 Caminho de upload:', photoPath);
          
          // Fazer upload (upsert:true vai sobrescrever se já existir)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technician-documents')
            .upload(photoPath, photoFile, { 
              upsert: true,
              contentType: photoFile.type,
              cacheControl: '3600'
            });
          
          if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            throw uploadError;
          }
          
          console.log('✅ Upload bem-sucedido!', uploadData);
          
          // Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('technician-documents')
            .getPublicUrl(photoPath);
          
          console.log('📎 URL pública gerada:', publicUrl);
          
          // Atualizar avatar no perfil com verificação
          console.log('💾 Salvando URL no perfil...');
          const { data: updateData, error: updateAvatarError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', createUserResult.user_id)
            .select();
          
          if (updateAvatarError) {
            console.error('❌ Erro ao atualizar avatar:', updateAvatarError);
            throw updateAvatarError;
          }
          
          console.log('✅ Avatar salvo com sucesso!', updateData);
          
          // Verificar se realmente foi salvo
          const { data: verifyData, error: verifyError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', createUserResult.user_id)
            .single();
          
          if (verifyError) {
            console.error('❌ Erro ao verificar avatar:', verifyError);
          } else {
            console.log('🔍 Verificação - Avatar no banco:', verifyData.avatar_url);
            if (verifyData.avatar_url === publicUrl) {
              console.log('✅ CONFIRMADO: Avatar salvo corretamente!');
            } else {
              console.error('⚠️ AVISO: Avatar URL não corresponde!');
            }
          }
          
        } catch (photoError) {
          console.error('❌ Erro crítico no processo de foto:', photoError);
          toast({
            title: "Aviso",
            description: "Técnico criado, mas houve erro ao salvar a foto. Tente fazer upload novamente na edição.",
            variant: "destructive",
          });
        }
      }

      // Buscar o technician_id criado
      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', createUserResult.user_id)
        .single();

      if (techError) throw techError;

      // Atualizar registro do técnico com dados do ASO
      const { error: updateError } = await supabase.from("technicians").update({
        specialty: data.role,
        cpf: data.cpf && data.cpf.trim() !== '' ? data.cpf : null,
        rg: data.rg && data.rg.trim() !== '' ? data.rg : null,
        birth_date: data.birth_date && data.birth_date.trim() !== '' ? data.birth_date : null,
        gender: data.gender && data.gender.trim() !== '' ? data.gender : null,
        nationality: data.nationality && data.nationality.trim() !== '' ? data.nationality : null,
        height: data.height && data.height.trim() !== '' ? parseInt(data.height) : null,
        blood_type: data.blood_type || null,
        blood_rh_factor: data.blood_rh_factor || null,
        aso_valid_until: data.aso_valid_until && data.aso_valid_until.trim() !== '' ? data.aso_valid_until : null,
        medical_status: data.medical_status || 'pending',
      }).eq('user_id', createUserResult.user_id);

      if (updateError) throw updateError;

      // Upload do ASO se fornecido
      if (uploadedFile && technicianData) {
        await uploadTechnicianDocuments(
          uploadedFile, 
          technicianData.id, 
          profileData.company_id
        );
      }

      // Upload das certificações
      if (certificationFiles.length > 0 && technicianData) {
        for (const cert of certificationFiles) {
          const certExt = cert.file.name.split('.').pop();
          const certPath = `${createUserResult.user_id}/certifications/${Date.now()}-${cert.file.name}`;
          
          const { error: certError } = await supabase.storage
            .from('technician-documents')
            .upload(certPath, cert.file);
          
          if (!certError) {
            await supabase.from('technician_documents').insert({
              technician_id: technicianData.id,
              document_type: 'certification',
              file_name: cert.file.name,
              file_path: certPath,
              certificate_name: cert.name,
              issue_date: cert.issueDate,
              expiry_date: cert.expiryDate,
            });
          }
        }
      }

      // Enviar email com senha ou link de reset
      if (data.password_option === 'reset_link') {
        await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/login`,
        });
      }

      setIsNewTechnicianOpen(false);
      fetchTechnicians();
      
      const passwordMessage = data.password_option === 'auto_email' 
        ? `Senha gerada: ${password}. Informe ao técnico.`
        : data.password_option === 'reset_link'
        ? 'Link de redefinição de senha enviado para o email.'
        : 'Senha definida com sucesso.';

      toast({
        title: "Técnico criado com sucesso",
        description: `${data.name} foi adicionado. ${passwordMessage}`,
      });
    } catch (error: any) {
      console.error('Error creating technician:', error);
      toast({
        title: "Erro ao criar técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsViewTechnicianOpen(true);
    }
  };

  const handleEditClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsEditTechnicianOpen(true);
    }
  };

  const handleUpdateTechnician = async (data: any, asoFile: File | null, photoFile: File | null, certificationFiles: Array<{file: File; name?: string; issueDate?: string; expiryDate?: string;}>) => {
    try {
      if (!selectedTechnician) return;

      // Obter company_id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) throw new Error("Company not found");

      // Update profile
      await supabase.from("profiles").update({
        full_name: data.name,
        phone: data.phone,
      }).eq("id", selectedTechnician.userId);

      // Upload nova foto se fornecida
      if (photoFile) {
        console.log('📸 Atualizando foto do técnico...');
        console.log('- User ID:', selectedTechnician.user_id);
        console.log('- Arquivo:', photoFile.name);
        console.log('- Tamanho:', (photoFile.size / 1024).toFixed(2), 'KB');
        console.log('- Tipo:', photoFile.type);
        
        try {
          // Validar arquivo
          if (!photoFile.type.startsWith('image/')) {
            throw new Error('Arquivo deve ser uma imagem');
          }
          
          if (photoFile.size > 5 * 1024 * 1024) {
            throw new Error('Imagem muito grande (máx 5MB)');
          }
          
          const photoExt = photoFile.name.split('.').pop();
          const photoPath = `${profileData.company_id}/${selectedTechnician.user_id}/avatar.${photoExt}`;
          
          console.log('📍 Caminho de upload:', photoPath);
          
          // Fazer upload (upsert:true vai sobrescrever se já existir)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technician-documents')
            .upload(photoPath, photoFile, { 
              upsert: true,
              contentType: photoFile.type,
              cacheControl: '3600'
            });
          
          if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            throw uploadError;
          }
          
          console.log('✅ Upload bem-sucedido!', uploadData);
          
          // Obter URL pública
          const { data: { publicUrl } } = supabase.storage
            .from('technician-documents')
            .getPublicUrl(photoPath);
          
          console.log('📎 URL pública gerada:', publicUrl);
          
          // Atualizar avatar no perfil com verificação
          console.log('💾 Atualizando URL no perfil...');
          const { data: updateData, error: updateAvatarError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', selectedTechnician.user_id)
            .select();
          
          if (updateAvatarError) {
            console.error('❌ Erro ao atualizar avatar:', updateAvatarError);
            throw updateAvatarError;
          }
          
          console.log('✅ Avatar atualizado com sucesso!', updateData);
          
          // Verificar se realmente foi salvo
          const { data: verifyData, error: verifyError } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', selectedTechnician.user_id)
            .single();
          
          if (verifyError) {
            console.error('❌ Erro ao verificar avatar:', verifyError);
          } else {
            console.log('🔍 Verificação - Avatar no banco:', verifyData.avatar_url);
            if (verifyData.avatar_url === publicUrl) {
              console.log('✅ CONFIRMADO: Avatar atualizado corretamente!');
            } else {
              console.error('⚠️ AVISO: Avatar URL não corresponde!');
            }
          }
          
        } catch (photoError) {
          console.error('❌ Erro crítico no processo de foto:', photoError);
          toast({
            title: "Aviso",
            description: "Técnico atualizado, mas houve erro ao salvar a foto. Tente novamente.",
            variant: "destructive",
          });
        }
      }

      // Update technician
      await supabase.from("technicians").update({
        specialty: data.role,
        active: data.isActive,
        cpf: data.cpf && data.cpf.trim() !== '' ? data.cpf : null,
        rg: data.rg && data.rg.trim() !== '' ? data.rg : null,
        birth_date: data.birth_date && data.birth_date.trim() !== '' ? data.birth_date : null,
        gender: data.gender || null,
        nationality: data.nationality && data.nationality.trim() !== '' ? data.nationality : null,
        height: data.height && data.height.trim() !== '' ? parseInt(data.height) : null,
        blood_type: data.blood_type || null,
        blood_rh_factor: data.blood_rh_factor || null,
        aso_valid_until: data.aso_valid_until && data.aso_valid_until.trim() !== '' ? data.aso_valid_until : null,
        medical_status: data.medical_status || null,
      }).eq("id", selectedTechnician.id);

      // Upload novo ASO se fornecido
      if (asoFile) {
        const fileExt = asoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${asoFile.name}`;
        const filePath = `${selectedTechnician.user_id}/aso/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('technician-documents')
          .upload(filePath, asoFile);

        if (!uploadError) {
          await supabase.from('technician_documents').insert({
            technician_id: selectedTechnician.id,
            document_type: 'aso',
            file_name: asoFile.name,
            file_path: filePath,
          });
        }
      }

      // Upload novas certificações
      if (certificationFiles.length > 0) {
        for (const cert of certificationFiles) {
          const certPath = `${selectedTechnician.user_id}/certifications/${Date.now()}-${cert.file.name}`;
          
          const { error: certError } = await supabase.storage
            .from('technician-documents')
            .upload(certPath, cert.file);
          
          if (!certError) {
            await supabase.from('technician_documents').insert({
              technician_id: selectedTechnician.id,
              document_type: 'certification',
              file_name: cert.file.name,
              file_path: certPath,
              certificate_name: cert.name,
              issue_date: cert.issueDate,
              expiry_date: cert.expiryDate,
            });
          }
        }
      }

      setIsEditTechnicianOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
      
      toast({
        title: "Técnico atualizado",
        description: `${data.name} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (!selectedTechnician) return;

      // Delete technician record
      await supabase.from("technicians").delete().eq("id", selectedTechnician.id);

      setIsDeleteDialogOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
      
      toast({
        title: "Técnico removido",
        description: `${selectedTechnician.name} foi removido com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredTechnicians.map(tech => ({
        nome: tech.name,
        email: tech.email,
        telefone: tech.phone || "-",
        especialidade: tech.role || "-",
        status: formatBooleanForExport(tech.isActive),
      }));

      const headers = {
        nome: "Nome",
        email: "Email",
        telefone: "Telefone",
        especialidade: "Especialidade",
        status: "Ativo",
      };

      exportToCSV(exportData, `tecnicos-${new Date().toISOString().split('T')[0]}`, headers);
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} técnicos exportados com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Técnicos</h1>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredTechnicians.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isNewTechnicianOpen} onOpenChange={setIsNewTechnicianOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Técnico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Técnico</DialogTitle>
              </DialogHeader>
              <NewTechnicianForm 
                onSubmit={handleCreateTechnician}
                onCancel={() => setIsNewTechnicianOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar técnicos..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
          <h3 className="text-lg font-medium">Nenhum técnico encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os filtros ou adicionar novos técnicos.
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.map((technician) => (
                <TableRow key={technician.id}>
                  <TableCell className="font-medium">{technician.name}</TableCell>
                  <TableCell>{technician.email}</TableCell>
                  <TableCell>{technician.phone || '-'}</TableCell>
                  <TableCell>{technician.role || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={technician.isActive ? "default" : "secondary"}>
                      {technician.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClick(technician.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(technician.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(technician.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      
      {/* View Dialog */}
      <Dialog open={isViewTechnicianOpen} onOpenChange={setIsViewTechnicianOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Técnico</DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <div className="space-y-6">
              {/* Avatar e Nome */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedTechnician.avatar_url || undefined} alt={selectedTechnician.name} />
                  <AvatarFallback className="text-2xl">
                    {selectedTechnician.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-bold">{selectedTechnician.name}</h3>
                  <p className="text-muted-foreground">{selectedTechnician.role}</p>
                </div>
              </div>

              <Separator />

              {/* Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Dados Pessoais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base">{selectedTechnician.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                    <p className="text-base">{selectedTechnician.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">CPF</p>
                    <p className="text-base">{selectedTechnician.cpf || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">RG</p>
                    <p className="text-base">{selectedTechnician.rg || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                    <p className="text-base">{selectedTechnician.birth_date ? format(new Date(selectedTechnician.birth_date), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gênero</p>
                    <p className="text-base">{selectedTechnician.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nacionalidade</p>
                    <p className="text-base">{selectedTechnician.nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Altura</p>
                    <p className="text-base">{selectedTechnician.height ? `${selectedTechnician.height} cm` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</p>
                    <p className="text-base">{selectedTechnician.blood_type && selectedTechnician.blood_rh_factor ? `${selectedTechnician.blood_type} ${selectedTechnician.blood_rh_factor}` : '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados Profissionais */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Dados Profissionais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cargo</p>
                    <p className="text-base">{selectedTechnician.role || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedTechnician.isActive ? "default" : "secondary"}>
                      {selectedTechnician.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados do ASO */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Atestado de Saúde Ocupacional (ASO)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Validade do ASO</p>
                    <p className="text-base">{selectedTechnician.aso_valid_until ? format(new Date(selectedTechnician.aso_valid_until), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status Médico</p>
                    <div className="flex gap-2">
                      <Badge variant={
                        selectedTechnician.medical_status === 'fit' ? 'default' : 
                        selectedTechnician.medical_status === 'unfit' ? 'destructive' : 
                        'secondary'
                      }>
                        {selectedTechnician.medical_status === 'fit' ? 'Apto' : 
                         selectedTechnician.medical_status === 'unfit' ? 'Inapto' : 
                         'Pendente'}
                      </Badge>
                      {selectedTechnician.aso_valid_until && (
                        <Badge className={getValidityStatus(selectedTechnician.aso_valid_until).color}>
                          {getValidityStatus(selectedTechnician.aso_valid_until).label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Certificações */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Certificações</h3>
                {selectedTechnician.documents && selectedTechnician.documents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTechnician.documents.map((doc: any) => {
                      const validityStatus = getValidityStatus(doc.expiry_date);
                      return (
                        <div key={doc.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-muted-foreground">Nome do Certificado</p>
                              <p className="text-base font-medium">{doc.certificate_name || doc.file_name}</p>
                            </div>
                            <Badge className={validityStatus.color}>
                              {validityStatus.label}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Data de Emissão</p>
                              <p className="text-base">{doc.issue_date ? format(new Date(doc.issue_date), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Data de Validade</p>
                              <p className="text-base">{doc.expiry_date ? format(new Date(doc.expiry_date), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                              <p className="text-base">{doc.document_type}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma certificação cadastrada</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditTechnicianOpen} onOpenChange={setIsEditTechnicianOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Técnico</DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <NewTechnicianForm
              initialData={{
                ...selectedTechnician,
                avatar_url: selectedTechnician.avatar_url,
                documents: selectedTechnician.documents
              }}
              onSubmit={handleUpdateTechnician}
              onCancel={() => setIsEditTechnicianOpen(false)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o técnico {selectedTechnician?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Technicians;
