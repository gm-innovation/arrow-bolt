import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, User, AlertTriangle, Eye, Pencil, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { NewTechnicianForm } from '@/components/admin/technicians/NewTechnicianForm';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TechnicianDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  certificate_name?: string;
  issue_date?: string;
  expiry_date?: string;
  created_at: string;
}

interface Technician {
  id: string;
  user_id: string;
  company_id: string;
  active: boolean;
  specialty?: string;
  aso_valid_until?: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  gender?: string;
  nationality?: string;
  height?: number;
  blood_type?: string;
  blood_rh_factor?: string;
  medical_status?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  technician_documents?: TechnicianDocument[];
}

const Technicians = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchTechnicians = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);

      const { data, error } = await supabase
        .from('technicians')
        .select(`
          *,
          profiles:profiles(full_name, email, phone, avatar_url),
          technician_documents(*)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, [user]);

  const filteredTechnicians = technicians.filter((tech) =>
    tech.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAsoStatus = (asoDate?: string) => {
    if (!asoDate) return { status: 'missing', label: 'Não informado', variant: 'secondary' as const };
    
    const date = new Date(asoDate);
    const today = new Date();
    const thirtyDaysFromNow = addDays(today, 30);

    if (date < today) return { status: 'expired', label: 'Vencido', variant: 'destructive' as const };
    if (date <= thirtyDaysFromNow) return { status: 'expiring', label: 'A vencer', variant: 'secondary' as const };
    return { status: 'valid', label: 'Válido', variant: 'default' as const };
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const handleViewTechnician = (tech: Technician) => {
    setSelectedTechnician(tech);
    setIsViewDialogOpen(true);
  };

  const handleEditTechnician = (tech: Technician) => {
    setSelectedTechnician(tech);
    setIsEditDialogOpen(true);
  };

  const handleDownloadDocument = async (doc: TechnicianDocument) => {
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
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: 'Não foi possível baixar o documento.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateTechnician = async (
    data: any, 
    uploadedFile: File | null, 
    photoFile: File | null, 
    certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string }>
  ) => {
    if (!selectedTechnician) return;

    try {
      // Upload new photo if provided
      if (photoFile) {
        try {
          const photoExt = photoFile.name.split('.').pop();
          const photoPath = `${selectedTechnician.user_id}/avatar.${photoExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('technician-avatars')
            .upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type });
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('technician-avatars')
              .getPublicUrl(photoPath);
            
            await supabase
              .from('profiles')
              .update({ avatar_url: publicUrl })
              .eq('id', selectedTechnician.user_id);
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
        }
      }

      // Update profile
      await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          phone: data.phone || null,
        })
        .eq('id', selectedTechnician.user_id);

      // Update technician
      await supabase
        .from('technicians')
        .update({
          specialty: data.role,
          cpf: data.cpf || null,
          rg: data.rg || null,
          birth_date: data.birth_date || null,
          gender: data.gender || null,
          nationality: data.nationality || null,
          height: data.height ? parseInt(data.height) : null,
          blood_type: data.blood_type || null,
          blood_rh_factor: data.blood_rh_factor || null,
          aso_valid_until: data.aso_valid_until || null,
          medical_status: data.medical_status || 'pending',
        })
        .eq('id', selectedTechnician.id);

      // Upload new ASO if provided
      if (uploadedFile) {
        const filePath = `${companyId}/${selectedTechnician.id}/aso/${Date.now()}-${uploadedFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from('technician-documents')
          .upload(filePath, uploadedFile);

        if (uploadError) {
          console.error('ASO upload error:', uploadError);
          toast({
            title: 'Erro ao salvar ASO',
            description: `Não foi possível enviar "${uploadedFile.name}".`,
            variant: 'destructive',
          });
        } else {
          const { error: insertError } = await supabase.from('technician_documents').insert({
            technician_id: selectedTechnician.id,
            document_type: 'aso',
            file_name: uploadedFile.name,
            file_path: filePath,
            metadata: data.aso_issue_date ? { aso_issue_date: data.aso_issue_date } : null
          });

          if (insertError) {
            console.error('ASO insert error:', insertError);
            toast({
              title: 'Erro ao salvar ASO',
              description: 'Upload feito, mas falhou ao registrar o documento.',
              variant: 'destructive',
            });
          }
        }
      }

      // Upload new certifications
      if (certificationFiles.length > 0) {
        let saved = 0;
        let failed = 0;

        for (let i = 0; i < certificationFiles.length; i++) {
          const cert = certificationFiles[i];
          const certPath = `${selectedTechnician.user_id}/certifications/${Date.now()}-${i}-${cert.file.name}`;

          const { error: certError } = await supabase.storage
            .from('technician-documents')
            .upload(certPath, cert.file);

          if (certError) {
            console.error('Certification upload error:', certError);
            failed++;
            continue;
          }

          const { error: insertError } = await supabase.from('technician_documents').insert({
            technician_id: selectedTechnician.id,
            document_type: 'certification',
            file_name: cert.file.name,
            file_path: certPath,
            certificate_name: cert.name || cert.file.name,
            issue_date: cert.issueDate,
            expiry_date: cert.expiryDate,
          });

          if (insertError) {
            console.error('Certification insert error:', insertError);
            failed++;
          } else {
            saved++;
          }
        }

        if (failed > 0) {
          toast({
            title: 'Aviso sobre documentos',
            description: `${saved} certificado(s) salvo(s), ${failed} falhou(aram).`,
            variant: 'destructive',
          });
        }
      }

      setIsEditDialogOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
      
      toast({
        title: "Técnico atualizado",
        description: `${data.name} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error updating technician:', error);
      toast({
        title: "Erro ao atualizar técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateTechnician = async (
    data: any, 
    uploadedFile: File | null, 
    photoFile: File | null, 
    certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string }>
  ) => {
    try {
      if (!companyId) throw new Error("Company not found");

      let password = '';
      if (data.password_option === 'auto_email' || data.password_option === 'reset_link') {
        password = generateSecurePassword();
      } else {
        password = data.password;
      }

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

      const { data: createUserResult, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: password,
          full_name: data.name,
          phone: data.phone || null,
          company_id: companyId,
          role: 'technician'
        }
      });

      if (createUserError) throw createUserError;
      if (!createUserResult?.user_id) throw new Error('Falha ao criar usuário');

      if (photoFile) {
        try {
          const photoExt = photoFile.name.split('.').pop();
          const photoPath = `${createUserResult.user_id}/avatar.${photoExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('technician-avatars')
            .upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type });
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('technician-avatars')
              .getPublicUrl(photoPath);
            
            await supabase
              .from('profiles')
              .update({ avatar_url: publicUrl })
              .eq('id', createUserResult.user_id);
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
        }
      }

      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', createUserResult.user_id)
        .single();

      if (techError) throw techError;

      await supabase.from("technicians").update({
        specialty: data.role,
        cpf: data.cpf || null,
        rg: data.rg || null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        nationality: data.nationality || null,
        height: data.height ? parseInt(data.height) : null,
        blood_type: data.blood_type || null,
        blood_rh_factor: data.blood_rh_factor || null,
        aso_valid_until: data.aso_valid_until || null,
        medical_status: data.medical_status || 'pending',
      }).eq('user_id', createUserResult.user_id);

      if (uploadedFile && technicianData) {
        const filePath = `${companyId}/${technicianData.id}/aso/${Date.now()}-${uploadedFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('technician-documents')
          .upload(filePath, uploadedFile);

        if (!uploadError) {
          await supabase.from('technician_documents').insert({
            technician_id: technicianData.id,
            document_type: 'aso',
            file_name: uploadedFile.name,
            file_path: filePath,
            metadata: data.aso_issue_date ? { aso_issue_date: data.aso_issue_date } : null
          });
        }
      }

      if (certificationFiles.length > 0 && technicianData) {
        for (const cert of certificationFiles) {
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

      if (data.password_option === 'reset_link') {
        await supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: `${window.location.origin}/login`,
        });
      }

      setIsDialogOpen(false);
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

  const getInitials = (name?: string) => {
    if (!name) return 'T';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'aso': return 'ASO';
      case 'certification': return 'Certificação';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestão de Técnicos</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Técnicos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Técnico</DialogTitle>
            </DialogHeader>
            <NewTechnicianForm 
              onSubmit={handleCreateTechnician}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou especialidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="outline">{filteredTechnicians.length} técnicos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>ASO</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum técnico encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnicians.map((tech) => {
                  const aso = getAsoStatus(tech.aso_valid_until);

                  return (
                    <TableRow key={tech.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={tech.profiles?.avatar_url} />
                            <AvatarFallback>{getInitials(tech.profiles?.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{tech.profiles?.full_name || 'Sem nome'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{tech.profiles?.email || '-'}</TableCell>
                      <TableCell>{tech.profiles?.phone || '-'}</TableCell>
                      <TableCell>{tech.specialty || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {aso.status === 'expired' && <AlertTriangle className="h-4 w-4 text-destructive" />}
                          {tech.aso_valid_until ? (
                            <span className={aso.status === 'expired' ? 'text-destructive' : ''}>
                              {format(new Date(tech.aso_valid_until), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          <Badge variant={aso.variant}>{aso.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tech.active ? 'default' : 'secondary'}>
                          {tech.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewTechnician(tech)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTechnician(tech)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Technician Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Técnico</DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedTechnician.profiles?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {getInitials(selectedTechnician.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedTechnician.profiles?.full_name}</h3>
                    <p className="text-muted-foreground">{selectedTechnician.profiles?.email}</p>
                    <Badge variant={selectedTechnician.active ? 'default' : 'secondary'} className="mt-1">
                      {selectedTechnician.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Personal Data */}
                <div>
                  <h4 className="font-semibold mb-3">Dados Pessoais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Telefone:</span>
                      <p>{selectedTechnician.profiles?.phone || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <p>{selectedTechnician.cpf || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RG:</span>
                      <p>{selectedTechnician.rg || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data de Nascimento:</span>
                      <p>
                        {selectedTechnician.birth_date 
                          ? format(new Date(selectedTechnician.birth_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gênero:</span>
                      <p>{selectedTechnician.gender || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nacionalidade:</span>
                      <p>{selectedTechnician.nationality || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Especialidade:</span>
                      <p>{selectedTechnician.specialty || '-'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Medical Data */}
                <div>
                  <h4 className="font-semibold mb-3">Dados Médicos</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Validade ASO:</span>
                      <div className="flex items-center gap-2">
                        {selectedTechnician.aso_valid_until ? (
                          <>
                            <p>{format(new Date(selectedTechnician.aso_valid_until), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <Badge variant={getAsoStatus(selectedTechnician.aso_valid_until).variant}>
                              {getAsoStatus(selectedTechnician.aso_valid_until).label}
                            </Badge>
                          </>
                        ) : (
                          <p>-</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tipo Sanguíneo:</span>
                      <p>
                        {selectedTechnician.blood_type 
                          ? `${selectedTechnician.blood_type}${selectedTechnician.blood_rh_factor || ''}`
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Altura:</span>
                      <p>{selectedTechnician.height ? `${selectedTechnician.height} cm` : '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status Médico:</span>
                      <p>{selectedTechnician.medical_status || '-'}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Documents */}
                <div>
                  <h4 className="font-semibold mb-3">Documentos</h4>
                  {selectedTechnician.technician_documents && selectedTechnician.technician_documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedTechnician.technician_documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {doc.certificate_name || doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getDocumentTypeLabel(doc.document_type)}
                                {doc.expiry_date && (
                                  <> • Validade: {format(new Date(doc.expiry_date), "dd/MM/yyyy", { locale: ptBR })}</>
                                )}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Baixar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum documento cadastrado</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Technician Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Técnico</DialogTitle>
          </DialogHeader>
          {selectedTechnician && (
            <NewTechnicianForm 
              onSubmit={handleUpdateTechnician}
              onCancel={() => setIsEditDialogOpen(false)}
              isEditing
              initialData={{
                name: selectedTechnician.profiles?.full_name || '',
                email: selectedTechnician.profiles?.email || '',
                phone: selectedTechnician.profiles?.phone || '',
                role: selectedTechnician.specialty || '',
                cpf: selectedTechnician.cpf || '',
                rg: selectedTechnician.rg || '',
                birth_date: selectedTechnician.birth_date || '',
                gender: (selectedTechnician.gender as 'Masculino' | 'Feminino') || undefined,
                nationality: selectedTechnician.nationality || '',
                height: selectedTechnician.height?.toString() || '',
                blood_type: (selectedTechnician.blood_type as 'A' | 'B' | 'AB' | 'O') || undefined,
                blood_rh_factor: (selectedTechnician.blood_rh_factor as 'Positivo' | 'Negativo') || undefined,
                aso_valid_until: selectedTechnician.aso_valid_until || '',
                medical_status: (selectedTechnician.medical_status as 'fit' | 'pending' | 'unfit') || 'pending',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Technicians;
