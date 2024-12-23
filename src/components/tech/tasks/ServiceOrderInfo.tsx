import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, KeyRound, User, Users } from "lucide-react";

type ServiceOrderInfoProps = {
  location: string;
  access: string;
  requester: {
    name: string;
    role: string;
  };
  supervisor: {
    name: string;
  };
  team: {
    leadTechnician: string;
    assistants: string[];
  };
};

export const ServiceOrderInfo = ({
  location,
  access,
  requester,
  supervisor,
  team,
}: ServiceOrderInfoProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Local</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Localização:</span>
            {location}
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span className="font-medium">Acesso:</span>
            {access}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsáveis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">Solicitante:</span>
            {requester.name} - {requester.role}
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">Supervisor:</span>
            {supervisor.name}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe Técnica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="font-medium">Técnico Responsável:</span>
            {team.leadTechnician}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Auxiliares:</span>
            <div className="flex flex-col gap-1">
              {team.assistants.map((assistant, index) => (
                <span key={index}>{assistant}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};