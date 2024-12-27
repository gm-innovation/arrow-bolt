import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FilePdf, Save, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeEntriesSection } from "@/components/tech/reports/TimeEntriesSection";
import { EquipmentInfoSection } from "@/components/tech/reports/EquipmentInfoSection";
import { ServiceDetailsSection } from "@/components/tech/reports/ServiceDetailsSection";
import { PhotosSection } from "@/components/tech/reports/PhotosSection";
import { TaskReport, TimeEntry } from "@/components/tech/reports/types";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";

const queryClient = new QueryClient();

const ReportFormContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [selectedTask, setSelectedTask] = useState("task1");
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [taskReports, setTaskReports] = useState<Record<string, TaskReport>>({
    task1: {
      modelInfo: "",
      brandInfo: "",
      serialNumber: "",
      reportedIssue: "",
      executedWork: "",
      result: "",
      nextVisitWork: "",
      suppliedMaterial: "",
      photos: [],
      timeEntries: [],
    },
  });

  const handleAddTimeEntry = (taskId: string) => {
    const newEntry = {
      id: crypto.randomUUID(),
      date: new Date(),
      type: "work_normal" as const,
      startTime: "",
      endTime: "",
    };

    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: [...prev[taskId].timeEntries, newEntry],
      },
    }));
  };

  const handleRemoveTimeEntry = (taskId: string, entryId: string) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: prev[taskId].timeEntries.filter((entry) => entry.id !== entryId),
      },
    }));
  };

  const handleUpdateTimeEntry = (
    taskId: string,
    entryId: string,
    field: keyof TimeEntry,
    value: any
  ) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        timeEntries: prev[taskId].timeEntries.map((entry) =>
          entry.id === entryId ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  const handleUpdateReport = (taskId: string, field: keyof TaskReport, value: any) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
      },
    }));
  };

  const handleUpdatePhotos = (taskId: string, photos: PhotoWithCaption[]) => {
    setTaskReports((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        photos,
      },
    }));
  };

  const handleSaveDraft = () => {
    toast({
      title: "Rascunho salvo",
      description: "O relatório foi salvo como rascunho.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Relatório enviado",
      description: "O relatório foi enviado para aprovação.",
    });
    navigate("/tech/reports");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {reportId ? "Editar Relatório" : "Novo Relatório"}
        </h2>
        <Button variant="outline" onClick={() => setIsPDFOpen(true)}>
          <FilePdf className="h-4 w-4 mr-2" />
          Visualizar PDF
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={selectedTask} onValueChange={setSelectedTask}>
          <TabsList>
            {Object.keys(taskReports).map((taskId) => (
              <TabsTrigger key={taskId} value={taskId}>
                Tarefa {taskId.replace("task", "")}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(taskReports).map(([taskId, report]) => (
            <TabsContent key={taskId} value={taskId} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Equipamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <EquipmentInfoSection
                    taskId={taskId}
                    report={report}
                    onUpdateReport={handleUpdateReport}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Serviço</CardTitle>
                </CardHeader>
                <CardContent>
                  <ServiceDetailsSection
                    taskId={taskId}
                    report={report}
                    onUpdateReport={handleUpdateReport}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fotos</CardTitle>
                </CardHeader>
                <CardContent>
                  <PhotosSection
                    taskId={taskId}
                    photos={report.photos}
                    onUpdatePhotos={handleUpdatePhotos}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Horários</CardTitle>
                </CardHeader>
                <CardContent>
                  <TimeEntriesSection
                    taskId={taskId}
                    timeEntries={report.timeEntries}
                    onAddTimeEntry={handleAddTimeEntry}
                    onRemoveTimeEntry={handleRemoveTimeEntry}
                    onUpdateTimeEntry={handleUpdateTimeEntry}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button type="submit">
            <Send className="h-4 w-4 mr-2" />
            Enviar para Aprovação
          </Button>
        </div>
      </form>

      <PDFPreviewDialog
        open={isPDFOpen}
        onOpenChange={setIsPDFOpen}
        report={taskReports[selectedTask]}
        taskId={selectedTask}
      />
    </div>
  );
};

const ReportForm = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ReportFormContent />
    </QueryClientProvider>
  );
};

export default ReportForm;
