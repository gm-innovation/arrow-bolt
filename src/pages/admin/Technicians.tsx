import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { Plus, Search, Download, Eye, Pencil, Trash2, FileText } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { exportToCSV, formatBooleanForExport } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import { sanitizeFileName } from "@/lib/utils";
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

  // Função para download de documentos
  const handleDownloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('technician-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: 'Não foi possível baixar o documento.',
        variant: 'destructive',
      });
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
            file_path,
            metadata
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
    companyId: string,
    asoIssueDate?: string
  ) => {
    console.log('🚀 uploadTechnicianDocuments chamado com asoIssueDate:', asoIssueDate);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${companyId}/${technicianId}/aso/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('technician-documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Prepare document data with metadata
    const documentData: any = {
      technician_id: technicianId,
      document_type: 'aso',
      file_name: file.name,
      file_path: filePath,
      metadata: asoIssueDate ? { aso_issue_date: asoIssueDate } : null
    };

    console.log('💾 Salvando documento com metadata:', JSON.stringify(documentData, null, 2));

    const { data: inserted, error: insertError } = await supabase
      .from('technician_documents')
      .insert(documentData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
      throw insertError;
    }

    console.log('✅ ASO salvo! Documento:', JSON.stringify(inserted, null, 2));
  };

  const handleCreateTechnician = async (data: any, uploadedFile: File | null, photoFile: File | null, certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string; }>) => {
    console.log('🚀 handleCreateTechnician - Data completa recebida:', JSON.stringify(data, null, 2));
    console.log('🚀 handleCreateTechnician - aso_issue_date específica:', data.aso_issue_date);
    console.log('🚀 handleCreateTechnician - Tipo:', typeof data.aso_issue_date);
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
          role: 'technician'
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
          // Usar caminho único com timestamp para evitar cache
          const photoPath = `${createUserResult.user_id}/avatar-${timestamp}.${photoExt}`;
          
          console.log('📍 Caminho de upload:', photoPath);
          
          // Fazer upload no bucket technician-avatars com cache mínimo
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technician-avatars')
            .upload(photoPath, photoFile, { 
              upsert: true,
              contentType: photoFile.type,
              cacheControl: '0'
            });
          
          if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            throw uploadError;
          }
          
          console.log('✅ Upload bem-sucedido!', uploadData);
          
          // Obter URL pública com query param para cache busting
          const { data: { publicUrl } } = supabase.storage
            .from('technician-avatars')
            .getPublicUrl(photoPath);
          
          const versionedUrl = `${publicUrl}?v=${timestamp}`;
          console.log('📎 URL pública gerada:', versionedUrl);
          
          // Atualizar avatar no perfil
          console.log('💾 Salvando URL no perfil...');
          const { data: updateData, error: updateAvatarError } = await supabase
            .from('profiles')
            .update({ avatar_url: versionedUrl })
            .eq('id', createUserResult.user_id)
            .select();
          
          if (updateAvatarError) {
            console.error('❌ Erro ao atualizar avatar:', updateAvatarError);
            throw updateAvatarError;
          }
          
          console.log('✅ Avatar salvo com sucesso!', updateData);
          
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
        console.log('📄 Preparando upload do ASO');
        console.log('- Technician ID:', technicianData.id);
        console.log('- ASO Issue Date:', data.aso_issue_date);
        
        await uploadTechnicianDocuments(
          uploadedFile, 
          technicianData.id, 
          profileData.company_id,
          data.aso_issue_date // Passando a data de emissão do ASO
        );
      }

      // Upload das certificações
      if (certificationFiles.length > 0 && technicianData) {
        console.log(`📜 Iniciando upload de ${certificationFiles.length} certificação(ões)`);
        let savedCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < certificationFiles.length; i++) {
          const cert = certificationFiles[i];
          // Sanitize file name to avoid "Invalid key" errors in Supabase Storage
          const sanitizedName = sanitizeFileName(cert.file.name);
          const certPath = `${profileData.company_id}/${technicianData.id}/certifications/${Date.now()}-${i}-${sanitizedName}`;
          
          console.log(`📜 [${i + 1}/${certificationFiles.length}] Uploading: ${cert.file.name}`);
          
          const { error: certError } = await supabase.storage
            .from('technician-documents')
            .upload(certPath, cert.file);
          
          if (certError) {
            console.error(`❌ Erro no upload da certificação ${cert.file.name}:`, certError);
            failedCount++;
            continue;
          }
          
          const { error: insertError } = await supabase.from('technician_documents').insert({
            technician_id: technicianData.id,
            document_type: 'certification',
            file_name: cert.file.name,
            file_path: certPath,
            certificate_name: cert.name || cert.file.name,
            issue_date: cert.issueDate,
            expiry_date: cert.expiryDate,
          });
          
          if (insertError) {
            console.error(`❌ Erro ao salvar certificação ${cert.file.name}:`, insertError);
            failedCount++;
          } else {
            console.log(`✅ Certificação salva: ${cert.name || cert.file.name}`);
            savedCount++;
          }
        }
        
        console.log(`📊 Resultado: ${savedCount} salva(s), ${failedCount} falha(s)`);
        
        if (failedCount > 0) {
          toast({
            title: "Aviso sobre certificações",
            description: `${savedCount} certificação(ões) salva(s), ${failedCount} falhou(aram). Tente novamente na edição.`,
            variant: "destructive",
          });
        } else if (savedCount > 0) {
          console.log(`✅ Todas as ${savedCount} certificações foram salvas com sucesso!`);
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
    console.log('========================================');
    console.log('🔧 handleUpdateTechnician INICIADO');
    console.log('========================================');
    console.log('📋 Dados recebidos:');
    console.log('  - data:', data?.name, data?.email);
    console.log('  - asoFile:', asoFile ? `${asoFile.name} (${(asoFile.size/1024).toFixed(1)}KB)` : 'null');
    console.log('  - photoFile:', photoFile ? `${photoFile.name} (${(photoFile.size/1024).toFixed(1)}KB)` : 'null');
    console.log('  - certificationFiles:', certificationFiles?.length || 0, 'arquivo(s)');
    
    if (certificationFiles && certificationFiles.length > 0) {
      certificationFiles.forEach((cert, i) => {
        console.log(`    [${i+1}] ${cert.file?.name || 'SEM ARQUIVO'} - ${cert.name || 'sem nome'}`);
        console.log(`        hasFile: ${!!cert.file}, size: ${cert.file ? (cert.file.size/1024).toFixed(1) + 'KB' : 'N/A'}`);
      });
    } else {
      console.log('  ⚠️ Nenhuma certificação recebida!');
    }
    
    try {
      if (!selectedTechnician) {
        console.error('❌ selectedTechnician é null!');
        return;
      }
      
      console.log('👤 Técnico selecionado:', selectedTechnician.name, '- ID:', selectedTechnician.id);

      // Obter company_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao buscar company_id:', profileError);
      }
      
      console.log('🏢 Company ID:', profileData?.company_id);

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
          
          // Remover avatar antigo se existir
          if (selectedTechnician.avatar_url) {
            try {
              const oldUrl = new URL(selectedTechnician.avatar_url);
              const pathMatch = oldUrl.pathname.match(/\/technician-avatars\/(.+?)(?:\?|$)/);
              if (pathMatch) {
                const oldPath = decodeURIComponent(pathMatch[1]);
                console.log('🗑️ Removendo avatar antigo:', oldPath);
                await supabase.storage.from('technician-avatars').remove([oldPath]);
              }
            } catch (e) {
              console.warn('⚠️ Não foi possível remover avatar antigo:', e);
            }
          }
          
          const photoExt = photoFile.name.split('.').pop();
          const timestamp = Date.now();
          // Usar caminho único com timestamp para evitar cache
          const photoPath = `${selectedTechnician.user_id}/avatar-${timestamp}.${photoExt}`;
          
          console.log('📍 Caminho de upload:', photoPath);
          
          // Fazer upload no bucket technician-avatars com cache mínimo
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technician-avatars')
            .upload(photoPath, photoFile, { 
              upsert: true,
              contentType: photoFile.type,
              cacheControl: '0'
            });
          
          if (uploadError) {
            console.error('❌ Erro no upload:', uploadError);
            throw uploadError;
          }
          
          console.log('✅ Upload bem-sucedido!', uploadData);
          
          // Obter URL pública com query param para cache busting
          const { data: { publicUrl } } = supabase.storage
            .from('technician-avatars')
            .getPublicUrl(photoPath);
          
          const versionedUrl = `${publicUrl}?v=${timestamp}`;
          console.log('📎 URL pública gerada:', versionedUrl);
          
          // Atualizar avatar no perfil
          console.log('💾 Atualizando URL no perfil...');
          const { data: updateData, error: updateAvatarError } = await supabase
            .from('profiles')
            .update({ avatar_url: versionedUrl })
            .eq('id', selectedTechnician.user_id)
            .select();
          
          if (updateAvatarError) {
            console.error('❌ Erro ao atualizar avatar:', updateAvatarError);
            throw updateAvatarError;
          }
          
          console.log('✅ Avatar atualizado com sucesso!', updateData);
          
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
        const fileName = `${Date.now()}-${asoFile.name}`;
        const filePath = `${profileData.company_id}/${selectedTechnician.id}/aso/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('technician-documents')
          .upload(filePath, asoFile);

        if (uploadError) {
          console.error('❌ Erro no upload do ASO:', uploadError);
          toast({
            title: "Erro ao salvar ASO",
            description: `Não foi possível enviar "${asoFile.name}". Tente novamente.`,
            variant: "destructive",
          });
        } else {
          const { error: insertError } = await supabase.from('technician_documents').insert({
            technician_id: selectedTechnician.id,
            document_type: 'aso',
            file_name: asoFile.name,
            file_path: filePath,
          });

          if (insertError) {
            console.error('❌ Erro ao salvar ASO no banco:', insertError);
            toast({
              title: "Erro ao salvar ASO",
              description: "Upload feito, mas falhou ao registrar o documento. Tente novamente.",
              variant: "destructive",
            });
          }
        }
      }

      // Upload novas certificações
      console.log('========================================');
      console.log('📜 PROCESSANDO CERTIFICAÇÕES');
      console.log('========================================');
      console.log('certificationFiles é:', typeof certificationFiles);
      console.log('certificationFiles length:', certificationFiles?.length);
      console.log('certificationFiles valor:', JSON.stringify(certificationFiles?.map(c => ({name: c.file?.name, hasFile: !!c.file})) || []));
      
      if (certificationFiles && certificationFiles.length > 0) {
        toast({
          title: "Salvando certificações...",
          description: `Iniciando upload de ${certificationFiles.length} certificação(ões)`,
        });
        
        let savedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];
        
        for (let i = 0; i < certificationFiles.length; i++) {
          const cert = certificationFiles[i];
          
          console.log(`📜 [${i + 1}/${certificationFiles.length}] Processando certificação:`);
          console.log('  - file:', cert.file);
          console.log('  - file.name:', cert.file?.name);
          console.log('  - file.size:', cert.file?.size);
          console.log('  - name:', cert.name);
          
          if (!cert.file) {
            console.error(`❌ Certificação ${i + 1} não tem arquivo!`);
            errors.push(`Certificação ${i + 1}: sem arquivo`);
            failedCount++;
            continue;
          }
          
          // Sanitize file name to avoid "Invalid key" errors in Supabase Storage
          const sanitizedName = sanitizeFileName(cert.file.name);
          const certPath = `${profileData?.company_id}/${selectedTechnician.id}/certifications/${Date.now()}-${i}-${sanitizedName}`;
          
          console.log(`📜 [${i + 1}/${certificationFiles.length}] Uploading para: ${certPath}`);
          
          try {
            const { data: uploadData, error: certError } = await supabase.storage
              .from('technician-documents')
              .upload(certPath, cert.file);
            
            if (certError) {
              console.error(`❌ Erro no upload da certificação ${cert.file.name}:`, certError);
              console.error('  Detalhes:', JSON.stringify(certError));
              errors.push(`${cert.file.name}: ${certError.message}`);
              failedCount++;
              continue;
            }
            
            console.log(`✅ Upload OK:`, uploadData);
            
            const { data: insertData, error: insertError } = await supabase.from('technician_documents').insert({
              technician_id: selectedTechnician.id,
              document_type: 'certification',
              file_name: cert.file.name,
              file_path: certPath,
              certificate_name: cert.name || cert.file.name,
              issue_date: cert.issueDate,
              expiry_date: cert.expiryDate,
            }).select();
            
            if (insertError) {
              console.error(`❌ Erro ao salvar certificação no banco ${cert.file.name}:`, insertError);
              console.error('  Detalhes:', JSON.stringify(insertError));
              errors.push(`${cert.file.name}: ${insertError.message}`);
              failedCount++;
            } else {
              console.log(`✅ Certificação salva no banco:`, insertData);
              savedCount++;
            }
          } catch (uploadException: any) {
            console.error(`❌ Exceção durante upload:`, uploadException);
            errors.push(`${cert.file?.name || 'arquivo'}: ${uploadException.message}`);
            failedCount++;
          }
        }
        
        console.log('========================================');
        console.log(`📊 RESULTADO FINAL: ${savedCount} salva(s), ${failedCount} falha(s)`);
        console.log('========================================');
        
        if (failedCount > 0) {
          toast({
            title: "Erro nas certificações",
            description: `${savedCount} salva(s), ${failedCount} falha(s): ${errors.slice(0, 2).join('; ')}`,
            variant: "destructive",
          });
        } else if (savedCount > 0) {
          toast({
            title: "Certificações salvas!",
            description: `${savedCount} certificação(ões) salva(s) com sucesso.`,
          });
        }
      } else {
        console.log('⚠️ Nenhuma certificação para processar (array vazio ou undefined)');
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

      // 1. Buscar documentos do técnico no storage
      const { data: documents } = await supabase
        .from('technician_documents')
        .select('file_path')
        .eq('technician_id', selectedTechnician.id);

      // 2. Excluir documentos do Storage
      if (documents && documents.length > 0) {
        const paths = documents.map(d => d.file_path);
        const { error: storageError } = await supabase.storage
          .from('technician-documents')
          .remove(paths);
        
        if (storageError) {
          console.warn('Aviso: Erro ao excluir documentos do storage:', storageError);
        } else {
          console.log(`🗑️ ${paths.length} documentos removidos do storage`);
        }
      }

      // 3. Excluir registro do técnico (documentos cascateia, históricos ficam com NULL)
      const { error: techError } = await supabase
        .from("technicians")
        .delete()
        .eq("id", selectedTechnician.id);

      if (techError) throw techError;

      // 4. Excluir o usuário via Edge Function
      const { error: userError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: selectedTechnician.user_id }
      });

      if (userError) {
        console.warn('Aviso: Erro ao excluir usuário:', userError);
        toast({
          title: "Técnico removido",
          description: `${selectedTechnician.name} foi removido, mas houve um erro ao excluir a conta de usuário.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Técnico removido",
          description: `${selectedTechnician.name} foi removido. Os históricos de trabalho foram preservados.`,
        });
      }

      setIsDeleteDialogOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
    } catch (error: any) {
      console.error('Erro ao remover técnico:', error);
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
                <DialogDescription>Preencha os dados do novo técnico</DialogDescription>
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
            <DialogDescription>Visualize as informações completas do técnico</DialogDescription>
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
                    <p className="text-base">
                      {selectedTechnician.birth_date 
                        ? new Date(selectedTechnician.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
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
                {(() => {
                  const asoDoc = selectedTechnician.documents?.find((doc: any) => doc.document_type === 'aso');
                  const asoMetadata = asoDoc?.metadata;
                  const asoIssueDate = asoMetadata?.aso_issue_date;
                  
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Data de Emissão/Exame</p>
                          <p className="text-base">
                            {(() => {
                              const issueDate = asoMetadata?.aso_issue_date;
                              if (!issueDate) return '-';
                              return new Date(issueDate + 'T00:00:00').toLocaleDateString('pt-BR');
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Data de Validade</p>
                          <p className="text-base">
                            {selectedTechnician.aso_valid_until 
                              ? new Date(selectedTechnician.aso_valid_until + 'T00:00:00').toLocaleDateString('pt-BR')
                              : '-'}
                          </p>
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

                      {/* Botão de download do ASO */}
                      {asoDoc && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadDocument(asoDoc)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Baixar ASO
                          </Button>
                        </div>
                      )}

                      {asoMetadata && (
                        <div className="border rounded-lg p-4 bg-muted/30">
                          <p className="text-sm font-semibold mb-3">Dados Extraídos do ASO</p>
                          <div className="grid grid-cols-2 gap-4">
                            {asoMetadata.nome && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Nome</p>
                                <p className="text-sm">{asoMetadata.nome}</p>
                              </div>
                            )}
                            {asoMetadata.cpf && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">CPF</p>
                                <p className="text-sm">{asoMetadata.cpf}</p>
                              </div>
                            )}
                            {asoMetadata.rg && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">RG</p>
                                <p className="text-sm">{asoMetadata.rg}</p>
                              </div>
                            )}
                            {asoMetadata.data_nascimento && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Data de Nascimento (ASO)</p>
                                <p className="text-sm">{new Date(asoMetadata.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                            {asoMetadata.exame_clinico && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Exame Clínico</p>
                                <p className="text-sm">{new Date(asoMetadata.exame_clinico + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                            {asoMetadata.validade && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Validade (ASO)</p>
                                <p className="text-sm">{new Date(asoMetadata.validade + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                              </div>
                            )}
                            {asoMetadata.funcao && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Função</p>
                                <p className="text-sm">{asoMetadata.funcao}</p>
                              </div>
                            )}
                            {asoMetadata.tipo_exame && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Tipo de Exame</p>
                                <p className="text-sm">{asoMetadata.tipo_exame}</p>
                              </div>
                            )}
                            {asoMetadata.empresa && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Empresa (ASO)</p>
                                <p className="text-sm">{asoMetadata.empresa}</p>
                              </div>
                            )}
                            {asoMetadata.medico && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">Médico Responsável</p>
                                <p className="text-sm">{asoMetadata.medico}</p>
                              </div>
                            )}
                            {asoMetadata.crm && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">CRM</p>
                                <p className="text-sm">{asoMetadata.crm}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Separator />

              {/* Certificações */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Certificações</h3>
                {selectedTechnician.documents && selectedTechnician.documents.filter((doc: any) => doc.document_type !== 'aso').length > 0 ? (
                  <div className="space-y-3">
                    {selectedTechnician.documents
                      .filter((doc: any) => doc.document_type !== 'aso')
                      .map((doc: any) => {
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
                                <p className="text-base">{doc.issue_date ? new Date(doc.issue_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Data de Validade</p>
                                <p className="text-base">{doc.expiry_date ? new Date(doc.expiry_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                                <p className="text-base">{doc.document_type}</p>
                              </div>
                              <div className="flex items-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex items-center gap-2"
                                >
                                  <Download className="h-4 w-4" />
                                  Baixar
                                </Button>
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
            <DialogDescription>Atualize as informações do técnico</DialogDescription>
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
            <AlertDialogDescription asChild>
              <div>
                <p>Tem certeza que deseja excluir o técnico <strong>{selectedTechnician?.name}</strong>?</p>
                <div className="mt-3">
                  <span className="text-destructive font-medium">Será excluído:</span>
                  <ul className="list-disc list-inside mt-2 text-sm">
                    <li>Dados cadastrais do técnico</li>
                    <li>Documentos e certificações</li>
                    <li>Conta de acesso ao sistema</li>
                  </ul>
                </div>
                <p className="text-muted-foreground text-sm mt-3">
                  ℹ️ Os históricos de trabalho, relatórios e registros de ponto serão preservados para auditoria.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Technicians;
