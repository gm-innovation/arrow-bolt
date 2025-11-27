import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
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

interface ServiceOrderData {
  id: string;
  orderNumber: string;
  date: Date;
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
  service: string;
}

  const ReportFormContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [selectedTask, setSelectedTask] = useState(taskId || "");
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceOrderData, setServiceOrderData] = useState<ServiceOrderData | null>(null);
  const [taskValidated, setTaskValidated] = useState(false);
  const [taskReports, setTaskReports] = useState<Record<string, TaskReport>>({});

  // Helper function to upload image to storage
  const uploadImageToStorage = async (file: File, taskId: string, imageIndex: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}_image_${imageIndex}_${Date.now()}.${fileExt}`;
      const filePath = `${taskId}/images/${fileName}`;

      console.log(`Uploading image ${imageIndex + 1} to storage:`, filePath);

      const { data, error } = await supabase.storage
        .from('reports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error(`Error uploading image ${imageIndex + 1}:`, error);
        return null;
      }

      console.log(`Image ${imageIndex + 1} uploaded successfully:`, data.path);
      return data.path;
    } catch (error) {
      console.error(`Error in uploadImageToStorage for image ${imageIndex + 1}:`, error);
      return null;
    }
  };

  // Helper function to get image from storage and create a File object
  const getImageFromStorage = async (storagePath: string, caption: string): Promise<PhotoWithCaption | null> => {
    try {
      console.log("Loading image from storage:", storagePath);
      
      const { data, error } = await supabase.storage
        .from('reports')
        .download(storagePath);

      if (error) {
        console.error("Error downloading image from storage:", error);
        return null;
      }

      // Create a File object from the blob
      const file = new File([data], storagePath.split('/').pop() || 'image', {
        type: data.type
      });

      console.log("Image loaded from storage successfully");
      
      return {
        file,
        caption,
        storagePath
      };
    } catch (error) {
      console.error("Error in getImageFromStorage:", error);
      return null;
    }
  };

  const fetchTaskReports = async () => {
    try {
      console.log("Fetching task reports for taskId:", taskId);
      const { data, error } = await supabase
        .from('task_reports')
        .select('*')
        .eq('task_id', taskId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching task reports:", error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log("Found saved report:", data[0]);
        const reportData = data[0].report_data as unknown as Record<string, TaskReport>;
        
        const reportsWithRecreatedFiles: Record<string, TaskReport> = {};
        
        for (const [key, report] of Object.entries(reportData)) {
          // Handle photos - try to load saved images
          const photosWithFiles: PhotoWithCaption[] = [];
          
          if (report.photos && Array.isArray(report.photos)) {
            for (const photo of report.photos) {
              if (photo.storagePath) {
                // Try to load the image from storage
                const photoWithFile = await getImageFromStorage(photo.storagePath, photo.caption);
                if (photoWithFile) {
                  photosWithFiles.push({
                    ...photoWithFile,
                    description: photo.description // ✅ Preserve description
                  });
                } else {
                  // If failed to load from storage, keep the reference
                  photosWithFiles.push({
                    caption: photo.caption,
                    storagePath: photo.storagePath,
                    description: photo.description // ✅ Preserve description
                  });
                }
              } else {
                // Photo without storage path (new or unsaved)
                photosWithFiles.push(photo);
              }
            }
          }
          
          reportsWithRecreatedFiles[key] = {
            ...report,
            photos: photosWithFiles,
          };
        }
        
        setTaskReports(reportsWithRecreatedFiles);
        return reportsWithRecreatedFiles;
      }
      
      return null;
    } catch (error) {
      console.error("Error in fetchTaskReports:", error);
      toast({
        title: "Erro ao carregar relatório",
        description: "Não foi possível carregar o relatório salvo. Iniciando um novo.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceOrderData = async () => {
    if (!taskId) {
      console.error("No taskId provided");
      toast({
        title: "Erro de validação",
        description: "ID da tarefa não foi fornecido. Você precisa selecionar uma tarefa para criar o relatório.",
        variant: "destructive",
      });
      navigate('/tech/tasks');
      return;
    }

    console.log("Fetching service order data for task:", taskId);

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          service_orders:service_order_id (
            id,
            order_number,
            scheduled_date,
            service_date_time,
            location,
            access,
            supervisor_id,
            vessels:vessel_id (name),
            clients:client_id (name, contact_person)
          ),
          task_types:task_type_id (name)
        `)
        .eq('id', taskId)
        .maybeSingle();

      console.log("Task data fetched:", taskData);
      console.log("Task error:", taskError);

      if (taskError) throw taskError;

      if (!taskData) {
        console.error("Task data is null");
        toast({
          title: "Tarefa não encontrada",
          description: "A tarefa selecionada não foi encontrada no sistema.",
          variant: "destructive",
        });
        navigate('/tech/tasks');
        return;
      }

      if (!taskData.service_orders) {
        console.error("Service order not found for task");
        toast({
          title: "OS não encontrada",
          description: "Esta tarefa não está vinculada a uma Ordem de Serviço.",
          variant: "destructive",
        });
        navigate('/tech/tasks');
        return;
      }

      // Fetch supervisor if exists
      let supervisorName = 'N/A';
      if (taskData.service_orders.supervisor_id) {
        const { data: supervisor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', taskData.service_orders.supervisor_id)
          .maybeSingle();
        supervisorName = supervisor?.full_name || 'N/A';
      }

      // Fetch all technicians for this service order
      const { data: allTasks } = await supabase
        .from('tasks')
        .select(`
          id,
          assigned_to,
          technicians:assigned_to (
            user_id,
            profiles:user_id (full_name)
          )
        `)
        .eq('service_order_id', taskData.service_orders.id);

      // Get unique technicians
      const uniqueTechIds = new Set();
      const techniciansList = allTasks
        ?.filter((t: any) => {
          if (!t.assigned_to || uniqueTechIds.has(t.assigned_to)) return false;
          uniqueTechIds.add(t.assigned_to);
          return true;
        })
        .map((t: any) => t.technicians?.profiles?.full_name)
        .filter(Boolean) || [];

      const uniqueTechnicians = [...new Set(techniciansList)];
      const leadTechnician = uniqueTechnicians[0] || 'Não atribuído';
      const assistants = uniqueTechnicians.slice(1);

      const so = taskData.service_orders as any;
      const orderNumber = so.order_number || taskData.id;
      
      const serviceOrderData = {
        id: orderNumber,
        orderNumber: orderNumber,
        date: so.service_date_time 
          ? new Date(so.service_date_time)
          : so.scheduled_date 
          ? new Date(so.scheduled_date) 
          : new Date(),
        location: so.location || so.vessels?.name || 'Local não especificado',
        access: so.access || 'Sem informações de acesso',
        requester: {
          name: so.clients?.contact_person || so.clients?.name || 'N/A',
          role: 'Solicitante',
        },
        supervisor: {
          name: supervisorName,
        },
        team: {
          leadTechnician,
          assistants,
        },
        service: taskData.task_types?.name || taskData.title || taskData.description || 'Serviço não especificado',
      };

      console.log("Service order data prepared:", serviceOrderData);
      setServiceOrderData(serviceOrderData);
      setTaskValidated(true);
      console.log("Task validated successfully");
    } catch (error: any) {
      console.error("Error fetching service order data:", error);
      toast({
        title: "Erro ao carregar dados da OS",
        description: error.message || "Não foi possível carregar as informações da Ordem de Serviço.",
        variant: "destructive",
      });
      navigate('/tech/tasks');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchServiceOrderData();
      
      // Only fetch task reports if we have a valid taskId
      if (taskId) {
        const savedReports = await fetchTaskReports();
        if (!savedReports) {
          console.log("No saved reports found, initializing with taskId");
          // Initialize with actual taskId instead of "task1"
          setSelectedTask(taskId);
          setTaskReports({
            [taskId]: {
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
        } else {
          // Set selected task to the taskId if saved reports exist
          setSelectedTask(taskId);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [taskId]);

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

  // Function to save images to storage and return updated photos with storage paths
  const saveImagesToStorage = async (reportData: Record<string, TaskReport>): Promise<Record<string, TaskReport>> => {
    const updatedReportData: Record<string, TaskReport> = {};
    
    for (const [taskId, report] of Object.entries(reportData)) {
      const updatedPhotos: PhotoWithCaption[] = [];
      
      if (report.photos && Array.isArray(report.photos)) {
        for (let i = 0; i < report.photos.length; i++) {
          const photo = report.photos[i];
          
          // If photo has file but no storage path, upload it
          if (photo.file && !photo.storagePath) {
            console.log(`Uploading new photo ${i + 1} for task ${taskId}`);
            const storagePath = await uploadImageToStorage(photo.file, taskId, i);
            
            if (storagePath) {
              updatedPhotos.push({
                caption: photo.caption,
                storagePath: storagePath,
                description: photo.description || "", // ✅ Preserve description
                file: photo.file // Keep file for immediate use
              });
            } else {
              // If upload failed, keep the original photo
              updatedPhotos.push(photo);
            }
          } else {
            // Photo already has storage path or no file
            updatedPhotos.push(photo);
          }
        }
      }
      
      updatedReportData[taskId] = {
        ...report,
        photos: updatedPhotos
      };
    }
    
    return updatedReportData;
  };

  // Helper function to get visit_id for a task
  const getVisitIdForTask = async (taskId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          service_orders:service_order_id (
            service_visits (id)
          )
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      
      const serviceOrders = data?.service_orders as any;
      const visits = serviceOrders?.service_visits;
      return visits && Array.isArray(visits) && visits.length > 0 ? visits[0].id : null;
    } catch (error) {
      console.error("Error fetching visit_id:", error);
      return null;
    }
  };

  const saveReportData = async (reportData: Record<string, TaskReport>, status: "draft" | "submitted") => {
    try {
      console.log("Starting report save process...");
      
      // First, save images to storage
      const reportDataWithStoragePaths = await saveImagesToStorage(reportData);
      
      console.log("Images saved, now saving report data to Supabase:", { taskId, status });
      
      // Prepare serializable report data - only include storage paths for photos
      const serializableReportData: Record<string, any> = {};
      
      for (const [key, report] of Object.entries(reportDataWithStoragePaths)) {
        const { photos, ...reportWithoutFiles } = report;
        
        // Process photos to save storage paths, captions AND descriptions
        const photosData = photos.map(photo => ({
          caption: photo.caption,
          storagePath: photo.storagePath,
          description: photo.description || "" // ✅ Include description
        }));
        
        serializableReportData[key] = {
          ...reportWithoutFiles,
          photos: photosData
        };
      }
      
      const { data: existingReports, error: fetchError } = await supabase
        .from('task_reports')
        .select('id')
        .eq('task_id', taskId)
        .eq('status', status);

      if (fetchError) {
        console.error("Error checking for existing report:", fetchError);
        throw fetchError;
      }

      // Get visit_id for the task
      const visitId = await getVisitIdForTask(taskId!);

      let result;
      if (existingReports && existingReports.length > 0) {
        result = await supabase
          .from('task_reports')
          .update({
            report_data: serializableReportData,
            visit_id: visitId, // ✅ Update visit_id
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReports[0].id);
      } else {
        result = await supabase
          .from('task_reports')
          .insert({
            task_id: taskId,
            task_uuid: taskId,
            visit_id: visitId, // ✅ Include visit_id
            status: status,
            report_data: serializableReportData
          });
      }

      if (result.error) {
        throw result.error;
      }

      console.log("Report data saved successfully:", result.data);
      
      // Update local state with the storage paths
      setTaskReports(reportDataWithStoragePaths);
      
      return true;
    } catch (error) {
      console.error("Error saving report data:", error);
      throw error;
    }
  };

  const generateAndSavePDF = async (taskId: string, report: TaskReport, status: "draft" | "submitted") => {
    try {
      console.log("Starting PDF generation...");
      if (!serviceOrderData) {
        throw new Error("Service order data not loaded");
      }
      const pdfDoc = <ReportPDFContent report={report} taskId={taskId} serviceOrder={serviceOrderData} />;
      const asPdf = pdf();
      asPdf.updateContainer(pdfDoc);
      console.log("PDF document created, generating blob...");
      const blob = await asPdf.toBlob();
      console.log("Blob generated:", blob);
      
      const fileName = `relatorio-${taskId}-${status}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      const { data, error } = await supabase.storage
        .from('reports')
        .upload(`${taskId}/${fileName}`, blob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      console.log("Upload successful:", data);
      return data?.path;
    } catch (error) {
      console.error(`Erro ao salvar PDF (${status}):`, error);
      throw error;
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      const report = taskReports[selectedTask];
      
      await saveReportData(taskReports, "draft");
      
      const pdfPath = await generateAndSavePDF(selectedTask, report, "draft");
      
      if (pdfPath) {
        const { data: existingReports } = await supabase
          .from('task_reports')
          .select('id')
          .eq('task_id', taskId)
          .eq('status', "draft");

        if (existingReports && existingReports.length > 0) {
          await supabase
            .from('task_reports')
            .update({ pdf_path: pdfPath })
            .eq('id', existingReports[0].id);
        }
      }
      
      toast({
        title: "Rascunho salvo",
        description: "O relatório e as imagens foram salvos como rascunho no servidor.",
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
      
      await saveReportData(taskReports, "submitted");
      
      for (const [taskId, report] of Object.entries(taskReports)) {
        const pdfPath = await generateAndSavePDF(taskId, report, "submitted");
        
        if (pdfPath) {
          const { data: existingReports } = await supabase
            .from('task_reports')
            .select('id')
            .eq('task_id', taskId)
            .eq('status', "submitted");

          if (existingReports && existingReports.length > 0) {
            await supabase
              .from('task_reports')
              .update({ pdf_path: pdfPath })
              .eq('id', existingReports[0].id);
          }
        }
      }
      
      toast({
        title: "Relatório enviado",
        description: "O relatório e as imagens foram enviados para aprovação e salvos no servidor.",
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando informações da OS...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!taskValidated || !serviceOrderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao Carregar Tarefa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Não foi possível carregar os dados da tarefa. Isso pode acontecer se:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>A tarefa não está vinculada a uma Ordem de Serviço</li>
              <li>Você não tem permissão para acessar esta tarefa</li>
              <li>A tarefa foi removida ou modificada</li>
              <li>Há um problema com as permissões do sistema</li>
            </ul>
            <Button 
              onClick={() => navigate('/tech/tasks')} 
              className="w-full"
            >
              Voltar para Tarefas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current report data
  const reportData = taskReports[selectedTask] || (taskId ? taskReports[taskId] : null);
  
  if (!reportData) {
    return (
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Inicializando relatório...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Voltar
          </Button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {reportId ? "Editar Relatório" : "Novo Relatório"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              OS: {serviceOrderData.orderNumber} - {serviceOrderData.service}
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setIsPDFOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <FileText className="mr-2 h-4 w-4" />
            Visualizar PDF
          </Button>
        </div>
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

      {serviceOrderData && (
        <PDFPreviewDialog
          open={isPDFOpen}
          onOpenChange={setIsPDFOpen}
          report={taskReports[selectedTask]}
          taskId={selectedTask}
          serviceOrder={serviceOrderData}
        />
      )}
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
