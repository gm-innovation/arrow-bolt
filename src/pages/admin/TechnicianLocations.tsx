import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MapPin, RefreshCw, Navigation, Clock } from 'lucide-react';
import { useAllTechnicianLocations, useTechnicianLocations, TechnicianLocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

const TechnicianLocations = () => {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const { locations: allLocations, loading: loadingAll, refetch: refetchAll } = useAllTechnicianLocations();
  const { locations: techLocations, loading: loadingTech, refetch: refetchTech } = useTechnicianLocations(
    selectedTechnician !== 'all' ? selectedTechnician : undefined,
    dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined
  );

  const locations = selectedTechnician === 'all' ? allLocations : techLocations;
  const loading = selectedTechnician === 'all' ? loadingAll : loadingTech;

  useEffect(() => {
    const fetchTechnicians = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profileData?.company_id) {
        const { data } = await supabase
          .from('technicians')
          .select(`
            id,
            profiles:user_id(full_name)
          `)
          .eq('company_id', profileData.company_id)
          .eq('active', true);

        setTechnicians(
          data?.map((t: any) => ({
            id: t.id,
            name: t.profiles?.full_name || 'N/A',
          })) || []
        );
      }
    };

    fetchTechnicians();
  }, [user?.id]);

  const getLocationTypeBadge = (type: string) => {
    switch (type) {
      case 'check_in':
        return <Badge className="bg-green-500">Check-in</Badge>;
      case 'check_out':
        return <Badge className="bg-red-500">Check-out</Badge>;
      default:
        return <Badge variant="secondary">Rastreamento</Badge>;
    }
  };

  const handleRefresh = () => {
    if (selectedTechnician === 'all') {
      refetchAll();
    } else {
      refetchTech();
    }
  };

  const openInMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Localização de Técnicos</h2>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Técnico</label>
              <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <MapPin className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-ins</p>
                <p className="text-2xl font-bold">
                  {locations.filter(l => l.location_type === 'check_in').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <MapPin className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-outs</p>
                <p className="text-2xl font-bold">
                  {locations.filter(l => l.location_type === 'check_out').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Navigation className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold">{locations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Histórico de Localizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando localizações...
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma localização registrada no período selecionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: any) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      {location.technician?.profiles?.full_name || 
                       technicians.find(t => t.id === location.technician_id)?.name ||
                       'N/A'}
                    </TableCell>
                    <TableCell>{getLocationTypeBadge(location.location_type)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {location.address || (
                        <span className="text-muted-foreground">Endereço não disponível</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {Number(location.latitude).toFixed(6)}, {Number(location.longitude).toFixed(6)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(location.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInMaps(Number(location.latitude), Number(location.longitude))}
                      >
                        <Navigation className="h-4 w-4 mr-1" />
                        Ver no Mapa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnicianLocations;
