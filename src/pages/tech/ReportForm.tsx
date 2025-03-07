import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TimeEntriesSection } from "@/components/tech/reports/TimeEntriesSection";
import { EquipmentInfoSection } from "@/components/tech/reports/EquipmentInfoSection";
import { ServiceDetailsSection } from "@/components/tech/reports/ServiceDetailsSection";
import { PhotosSection } from "@/components/tech/reports/PhotosSection";
import { TaskReport, TimeEntry, PhotoWithCaption } from "@/components/tech/reports/types";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { ReportPDFContent } from "@/components/tech/reports/ReportPDF";

const queryClient = new QueryClient();

const mockServiceOrder = {
  id: "OS-001",
  date: new Date(),
  location: "Porto de Santos",
  access: "Acesso Principal",
  requester: {
    name: "João Silva",
    role: "Supervisor de Operações",
  },
  supervisor: {
    name: "Maria Santos",
  },
  team: {
    leadTechnician: "Pedro Oliveira",
    assistants: ["Carlos Souza", "Ana Lima"],
  },
  service: "Manutenção Preventiva",
};

const ReportFormContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId") || "task1";

  const [selectedTask, setSelectedTask] = useState("task1");
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const generateAndSavePDF = async (taskId: string, report: TaskReport, status: "draft" | "submitted") => {
    try {
      console.log("Starting PDF generation...");
      const pdfDoc = <ReportPDFContent report={report} taskId={taskId} serviceOrder={mockServiceOrder} />;
      const asPdf = pdf();
      asPdf.updateContainer(pdfDoc);
      console.log("PDF document created, generating blob...");
      const blob = await asPdf.toBlob();
      console.log("Blob generated:", blob);
      
      const fileName = `relatorio-${taskId}-${status}-${new Date().toISOString().replace(/:/g, '-')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      
      const filePath = `${taskId}/${fileName}`;
      console.log(`Attempting to upload to: ${filePath}`);

      const supabaseUrl = 'https://ykehegyguicjssxacyoe.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZWhlZ3lndWljanNzeGFjeW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDU0NjcsImV4cCI6MjA0NjU4MTQ2N30.ayp1wZRHzkCKuIxkOk958ES7viF9p94h701WaC5MslU';
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${supabaseUrl}/storage/v1/object/reports/${filePath}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Upload error (${status}):`, errorData);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Successfully uploaded to ${filePath}`, data);
      return filePath;
    } catch (error) {
      console.error(`Erro ao salvar PDF (${status}):`, error);
      throw error;
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const report = taskReports[selectedTask];
      await generateAndSavePDF(selectedTask, report, "draft");
      
      toast({
        title: "Rascunho salvo",
        description: "O relatório foi salvo como rascunho no servidor.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o rascunho. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      for (const [taskId, report] of Object.entries(taskReports)) {
        await generateAndSavePDF(taskId, report, "submitted");
      }
      
      toast({
        title: "Relatório enviado",
        description: "O relatório foi enviado para aprovação e salvo no servidor.",
      });
      
      navigate("/tech/reports");
    } catch (error) {
      console.error("Erro ao enviar relatório:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o relatório. Tente novamente.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          {reportId ? "Editar Relatório" : "Novo Relatório"}
        </h2>
        <Button variant="outline" onClick={() => setIsPDFOpen(true)}>
          <FileText className="h-4 w-4 mr-2" />
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
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Rascunho"}
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Enviando..." : "Enviar para Aprovação"}
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
