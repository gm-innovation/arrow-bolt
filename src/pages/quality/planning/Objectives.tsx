import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import { ObjectivesTab } from "../Planning";

const PlanningObjectives = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" /> Objetivos da Qualidade
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Objetivos operacionais do SGQ vinculados à Política da Qualidade (ISO 9001 §6.2).
        </p>
      </CardHeader>
    </Card>
    <ObjectivesTab />
  </div>
);

export default PlanningObjectives;
