import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, Calendar, Clock, User, Wrench, ListChecks, Image } from "lucide-react";
import { format } from "date-fns";

// Mock data types - replace with real types later
type Tool = {
  name: string;
  quantity: number;
};

type Step = {
  order: number;
  description: string;
};

type PhotoLabel = {
  id: string;
  description: string;
};

type AdminInfoProps = {
  taskType: {
    name: string;
    tools: Tool[];
    steps: Step[];
    photoLabels: PhotoLabel[];
  };
};

export const AdminInfo = ({ taskType }: AdminInfoProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas e Equipamentos Necessários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {taskType.tools.map((tool, index) => (
              <li key={index}>
                {tool.name} - {tool.quantity} unidade(s)
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Passo a Passo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            {taskType.steps.map((step) => (
              <li key={step.order} className="pl-2">
                {step.description}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Fotos Necessárias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            {taskType.photoLabels.map((label) => (
              <li key={label.id}>{label.description}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};