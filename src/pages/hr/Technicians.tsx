import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, User, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { NewTechnicianForm } from '@/components/admin/technicians/NewTechnicianForm';

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
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTechnicians = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

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
            <NewTechnicianForm onSuccess={() => {
              setIsDialogOpen(false);
              fetchTechnicians();
            }} />
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
