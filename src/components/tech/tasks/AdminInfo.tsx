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
  // Helper function to safely get array
  const safeArray = <T,>(arr: T[] | null | undefined): T[] => {
    return Array.isArray(arr) ? arr : [];
  };

  // Parse tools, steps, and photo labels - pode vir como array de strings ou objetos
  const tools = safeArray(taskType?.tools);
  const steps = safeArray(taskType?.steps);
  const photoLabels = safeArray(taskType?.photoLabels);

  return (
    <div className="space-y-6">
      {tools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Ferramentas e Equipamentos Necessários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {tools.map((tool, index) => (
                <li key={index}>
                  {typeof tool === 'string' ? tool : `${tool.name} - ${tool.quantity} unidade(s)`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {steps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Passo a Passo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {steps.map((step, index) => (
                <li key={index} className="pl-2">
                  {typeof step === 'string' ? step : step.description}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {photoLabels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Fotos Necessárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {photoLabels.map((label, index) => (
                <li key={index}>
                  {typeof label === 'string' ? label : (label as any)?.description || String(label)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};