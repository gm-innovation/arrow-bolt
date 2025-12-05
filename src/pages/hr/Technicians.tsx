import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, User, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { NewTechnicianForm } from '@/components/admin/technicians/NewTechnicianForm';
import { useToast } from '@/hooks/use-toast';

interface Technician {
  id: string;
  user_id: string;
  company_id: string;
  active: boolean;
  specialty?: string;
  aso_valid_until?: string;
  cpf?: string;
  birth_date?: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

const Technicians = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

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
          profiles:profiles(full_name, email, phone)
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

  const handleCreateTechnician = async (
    data: any, 
    uploadedFile: File | null, 
    photoFile: File | null, 
    certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string }>
  ) => {
    try {
      if (!companyId) throw new Error("Company not found");

      // Generate password based on option
      let password = '';
      if (data.password_option === 'auto_email' || data.password_option === 'reset_link') {
        password = generateSecurePassword();
      } else {
        password = data.password;
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

      // Create user via edge function
      const { data: createUserResult, error: createUserError } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: password,
          full_name: data.name,
          phone: data.phone || null,
          company_id: companyId,
          role: 'tech'
        }
      });

      if (createUserError) throw createUserError;
      if (!createUserResult?.user_id) throw new Error('Falha ao criar usuário');

      // Upload photo if provided
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

      // Get technician_id
      const { data: technicianData, error: techError } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', createUserResult.user_id)
        .single();

      if (techError) throw techError;

      // Update technician with ASO data
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

      // Upload ASO if provided
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

      // Upload certifications
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

      // Send reset link if option selected
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                          <User className="h-4 w-4 text-muted-foreground" />
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Technicians;