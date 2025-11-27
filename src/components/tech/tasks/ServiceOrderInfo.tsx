import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, UserCircle, Ship, Building } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ServiceOrderInfoProps {
  location: string;
  access: string;
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
    name: string;
    type: string;
    flag: string;
    imo: string;
  };
}

export const ServiceOrderInfo = ({
  location,
  access,
  requester,
  supervisor,
  team,
  vessel,
}: ServiceOrderInfoProps) => {
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

      {/* Vessel Information */}
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
            <p className="text-sm font-medium text-muted-foreground">Local</p>
            <p className="text-sm">{location}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Instruções de Acesso</p>
            <p className="text-sm">{access}</p>
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
