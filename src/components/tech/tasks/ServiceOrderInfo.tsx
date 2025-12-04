import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, UserCircle, Ship, Building, Anchor, Navigation, Info, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useVesselPosition, translateLocationContext, translateNavigationStatus } from "@/hooks/useVesselPosition";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceOrderInfoProps {
  location: string;
  access: string;
  plannedLocation?: string;
  accessInstructions?: string;
  expectedContext?: string;
  boardingMethod?: string;
  vesselId?: string;
  requester: {
    name: string;
    role: string;
    company?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
  };
  supervisor: {
    name: string;
    phone?: string;
    email?: string;
  };
  team: {
    leadTechnician: string;
    assistants: string[];
  };
  vessel?: {
    id?: string;
    name: string;
    type: string;
    flag: string;
    imo: string;
  };
}

const translateExpectedContext = (context: string): string => {
  const contexts: Record<string, string> = {
    'docked': 'Atracado no Porto',
    'anchored': 'Fundeado (na baía)',
    'offshore': 'Offshore',
    'at_sea': 'Em Alto Mar',
  };
  return contexts[context] || context;
};

const translateBoardingMethod = (method: string): string => {
  const methods: Record<string, string> = {
    'gangway': 'Prancha / Escada',
    'launch': 'Lancha',
    'helicopter': 'Helicóptero',
    'other': 'Outro',
  };
  return methods[method] || method;
};

const getContextColor = (context: string) => {
  switch (context) {
    case 'port': return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'bay': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    case 'offshore': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'at_sea': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    default: return 'bg-muted text-muted-foreground';
  }
};

export const ServiceOrderInfo = ({
  location,
  access,
  plannedLocation,
  accessInstructions,
  expectedContext,
  boardingMethod,
  vesselId,
  requester,
  supervisor,
  team,
  vessel,
}: ServiceOrderInfoProps) => {
  const { position, isLoading, source, refresh } = useVesselPosition(vessel?.id || vesselId || null);
  
  // Use new fields if available, fallback to old ones
  const displayLocation = plannedLocation || location;
  const displayAccess = accessInstructions || access;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="h-5 w-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Empresa</p>
            <p className="text-sm">{requester.company || requester.name}</p>
          </div>
          {requester.cnpj && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">CNPJ</p>
              <p className="text-sm">{requester.cnpj}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Contato</p>
            <p className="text-sm">{requester.name}</p>
            {requester.phone && <p className="text-xs text-muted-foreground">{requester.phone}</p>}
            {requester.email && <p className="text-xs text-muted-foreground">{requester.email}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Vessel Information with AIS */}
      {vessel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ship className="h-5 w-5" />
              Informações da Embarcação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome</p>
              <p className="text-sm">{vessel.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                <p className="text-sm">{vessel.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bandeira</p>
                <p className="text-sm">{vessel.flag}</p>
              </div>
            </div>
            {vessel.imo && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">IMO</p>
                <p className="text-sm">{vessel.imo}</p>
              </div>
            )}
            
            {/* AIS Position Info */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Posição AIS</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {source === 'ais' ? 'Tempo Real' : source === 'database' ? 'Última Conhecida' : 'Indisponível'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoading}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : position ? (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getContextColor(position.location_context)}>
                      {translateLocationContext(position.location_context)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {translateNavigationStatus(position.navigation_status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Velocidade:</span>{' '}
                      {position.speed_over_ground?.toFixed(1) || '0'} nós
                    </div>
                    {position.destination && (
                      <div>
                        <span className="text-muted-foreground">Destino:</span>{' '}
                        {position.destination}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                  <Info className="h-4 w-4" />
                  <span>Posição AIS não disponível</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Local e Acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Local de Atendimento</p>
            <p className="text-sm">{displayLocation || 'Não informado'}</p>
          </div>
          
          {expectedContext && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Situação Esperada</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {translateExpectedContext(expectedContext)}
                </Badge>
              </div>
            </div>
          )}
          
          {boardingMethod && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Método de Embarque</p>
              <p className="text-sm">{translateBoardingMethod(boardingMethod)}</p>
            </div>
          )}
          
          <Separator />
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Instruções de Acesso</p>
            <p className="text-sm whitespace-pre-wrap">{displayAccess || 'Não informado'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Equipe e Supervisão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Supervisor</p>
            <p className="text-sm">{supervisor.name}</p>
            {supervisor.phone && <p className="text-xs text-muted-foreground">{supervisor.phone}</p>}
            {supervisor.email && <p className="text-xs text-muted-foreground">{supervisor.email}</p>}
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Técnico Responsável</p>
            <p className="text-sm">{team.leadTechnician}</p>
          </div>
          {team.assistants && Array.isArray(team.assistants) && team.assistants.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auxiliares</p>
                <ul className="text-sm list-disc list-inside">
                  {team.assistants.map((assistant, index) => (
                    <li key={index}>{assistant}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
