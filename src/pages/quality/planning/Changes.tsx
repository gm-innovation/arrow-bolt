import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";
import { ChangesTab } from "../Planning";

const PlanningChanges = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" /> Mudanças Planejadas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Avaliação prévia e eficácia de mudanças no SGQ conforme ISO 9001 §6.3.
        </p>
      </CardHeader>
    </Card>
    <ChangesTab />
  </div>
);

export default PlanningChanges;
