import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useMeasurements } from "@/hooks/useMeasurements";
import { BasicInfoTab } from "./BasicInfoTab";
import { ManHoursTab } from "./ManHoursTab";
import { MaterialsTab } from "./MaterialsTab";
import { ServicesTab } from "./ServicesTab";
import { TravelsTab } from "./TravelsTab";
import { ExpensesTab } from "./ExpensesTab";
import { MeasurementSummary } from "./MeasurementSummary";

interface MeasurementFormProps {
  serviceOrderId: string;
  onClose?: () => void;
}

export const MeasurementForm = ({ serviceOrderId, onClose }: MeasurementFormProps) => {
  const { measurement, isLoading, finalizeMeasurement } = useMeasurements(serviceOrderId);
  const [activeTab, setActiveTab] = useState("basic");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Medição não encontrada
      </div>
    );
  }

  const isDraft = measurement.status === 'draft';

  const handleFinalize = async () => {
    await finalizeMeasurement.mutateAsync(measurement.id);
    onClose?.();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="manhours">Mão de Obra</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="travels">Deslocamento</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <TabsContent value="basic" className="mt-0">
              <BasicInfoTab 
                measurement={measurement} 
                serviceOrderId={serviceOrderId}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="manhours" className="mt-0">
              <ManHoursTab 
                measurementId={measurement.id}
                manHours={measurement.measurement_man_hours || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="materials" className="mt-0">
              <MaterialsTab 
                measurementId={measurement.id}
                materials={measurement.measurement_materials || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <ServicesTab 
                measurementId={measurement.id}
                services={measurement.measurement_services || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="travels" className="mt-0">
              <TravelsTab 
                measurementId={measurement.id}
                travels={measurement.measurement_travels || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0">
              <ExpensesTab 
                measurementId={measurement.id}
                expenses={measurement.measurement_expenses || []}
                disabled={!isDraft}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <MeasurementSummary measurement={measurement} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {isDraft ? 'Fechar' : 'Voltar'}
        </Button>
        {isDraft && (
          <Button 
            onClick={handleFinalize}
            disabled={finalizeMeasurement.isPending}
          >
            {finalizeMeasurement.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Finalizar Medição
          </Button>
        )}
      </div>
    </div>
  );
};
