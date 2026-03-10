import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Save, Send, User, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { TimeEntriesSection } from "@/components/tech/reports/TimeEntriesSection";
import { EquipmentInfoSection } from "@/components/tech/reports/EquipmentInfoSection";
import { ServiceDetailsSection } from "@/components/tech/reports/ServiceDetailsSection";
import { PhotosSection } from "@/components/tech/reports/PhotosSection";
import { MaterialsSection } from "@/components/tech/reports/MaterialsSection";
import { TaskReport, TimeEntry, PhotoWithCaption, validateTaskReport } from "@/components/tech/reports/types";
import { PhotoGalleryDialog } from "@/components/tech/reports/PhotoGalleryDialog";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { pdf } from "@react-pdf/renderer";
import { ReportPDFContent } from "@/components/tech/reports/ReportPDF";

const queryClient = new QueryClient();

interface ServiceOrderData {
  id: string;
  serviceOrderId: string;
  orderNumber: string;
  date: Date;
  location: string;
  access: string;
  vesselName?: string;
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
  taskTitle?: string;
  company: {
    name: string;
    email: string;
    phone: string;
    address: string;
    cnpj: string;
    cep: string;
    logoUrl: string;
  };
}

interface TaskInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  taskTypeName: string;
  taskTypeId: string; // Added for deduplication
  photoLabels: string[];
}

const ReportFormContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { reportId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceOrderId = searchParams.get("serviceOrderId");
  // Keep taskId for backward compatibility
  const legacyTaskId = searchParams.get("taskId");

  const [selectedTask, setSelectedTask] = useState("");
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceOrderData, setServiceOrderData] = useState<ServiceOrderData | null>(null);
  const [taskValidated, setTaskValidated] = useState(false);
  const [taskReports, setTaskReports] = useState<Record<string, TaskReport>>({});
  const [requiredPhotoLabels, setRequiredPhotoLabels] = useState<string[]>([]);
  const [currentServiceOrderId, setCurrentServiceOrderId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [allTasks, setAllTasks] = useState<TaskInfo[]>([]);
  const [taskPhotoLabels, setTaskPhotoLabels] = useState<Record<string, string[]>>({});
  const [lastEditInfo, setLastEditInfo] = useState<{ editorName: string; editedAt: Date } | null>(null);

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

  const fetchTaskReports = async (osId: string, tasksInfo: TaskInfo[]) => {
    try {
      console.log("Fetching task reports for service order:", osId);
      
      // First try to find report by service_order_id in task_id field
      const { data, error } = await supabase
        .from('task_reports')
        .select('*')
        .eq('task_id', osId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching task reports:", error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log("Found saved report:", data[0]);
        const savedReport = data[0];
        const reportData = savedReport.report_data as unknown as Record<string, TaskReport>;
        
        // Fetch last edit info from history
        const { data: historyData } = await supabase
          .from('task_report_history')
          .select('edited_by, created_at, profiles:edited_by(full_name)')
          .eq('report_id', savedReport.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (historyData) {
          setLastEditInfo({
            editorName: (historyData.profiles as any)?.full_name || 'Usuário desconhecido',
            editedAt: new Date(historyData.created_at)
          });
        }
        
        const reportsWithRecreatedFiles: Record<string, TaskReport> = {};
        
        // Process saved reports and load photos
        for (const [taskId, report] of Object.entries(reportData)) {
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
                    description: photo.description
                  });
                } else {
                  // If failed to load from storage, keep the reference
                  photosWithFiles.push({
                    caption: photo.caption,
                    storagePath: photo.storagePath,
                    description: photo.description
                  });
                }
              } else {
                // Photo without storage path (new or unsaved)
                photosWithFiles.push(photo);
              }
            }
          }
          
          reportsWithRecreatedFiles[taskId] = {
            ...report,
            photos: photosWithFiles,
          };
        }
        
        // Ensure all tasks have a report (initialize missing ones)
        for (const task of tasksInfo) {
          if (!reportsWithRecreatedFiles[task.id]) {
            reportsWithRecreatedFiles[task.id] = {
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
            };
          }
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

  const fetchServiceOrderData = async (osId: string) => {
    console.log("Fetching service order data for OS:", osId);

    try {
      // Fetch service order data directly
      const { data: soData, error: soError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_reference,
          scheduled_date,
          service_date_time,
          location,
          access,
          supervisor_id,
          company_id,
          single_report,
          vessels:vessel_id (name),
          clients:client_id (name, contact_person)
        `)
        .eq('id', osId)
        .maybeSingle();

      console.log("Service order data fetched:", soData);

      if (soError) throw soError;

      if (!soData) {
        console.error("Service order data is null");
        toast({
          title: "OS não encontrada",
          description: "A Ordem de Serviço não foi encontrada no sistema.",
          variant: "destructive",
        });
        navigate('/tech/tasks');
        return;
      }

      // Fetch ALL tasks from this OS
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          task_type_id,
          task_types:task_type_id (name, photo_labels)
        `)
        .eq('service_order_id', osId)
        .order('created_at', { ascending: true });

      let fetchedTasks: TaskInfo[] = (tasksData || []).map((task: any) => ({
        id: task.id,
        title: task.title || task.description || 'Tarefa',
        description: task.description || '',
        status: task.status,
        taskTypeId: task.task_type_id || '',
        taskTypeName: task.task_types?.name || task.title || 'Tarefa',
        photoLabels: task.task_types?.photo_labels || [],
      }));
      
      // CRITICAL: Deduplicate tasks by task_type_id when single_report=true
      // This handles legacy data where multiple tasks exist per type
      const isSingleReport = (soData as any).single_report !== false;
      if (isSingleReport) {
        const seenTaskTypes = new Set<string>();
        const deduplicatedTasks: TaskInfo[] = [];
        
        for (const task of fetchedTasks) {
          if (task.taskTypeId) {
            if (!seenTaskTypes.has(task.taskTypeId)) {
              seenTaskTypes.add(task.taskTypeId);
              deduplicatedTasks.push(task);
            }
            // Skip duplicates
          } else {
            deduplicatedTasks.push(task);
          }
        }
        fetchedTasks = deduplicatedTasks;
      }
      
      setAllTasks(fetchedTasks);
      
      // Build photo labels map per task
      const labelsMap: Record<string, string[]> = {};
      fetchedTasks.forEach(task => {
        labelsMap[task.id] = task.photoLabels;
      });
      setTaskPhotoLabels(labelsMap);

      // Fetch supervisor if exists
      let supervisorName = 'N/A';
      if (soData.supervisor_id) {
        const { data: supervisor } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', soData.supervisor_id)
          .maybeSingle();
        supervisorName = supervisor?.full_name || 'N/A';
      }

      // Fetch visit data - Step 1: Get the most recent visit
      console.log("Fetching visit for service order:", soData.id);
      const { data: visit, error: visitError } = await supabase
        .from('service_visits')
        .select('id, visit_number')
        .eq('service_order_id', soData.id)
        .order('visit_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (visitError) {
        console.error("Error fetching visit:", visitError);
      }
      console.log("Visit result:", visit);

      // Step 2: Fetch visit technicians separately to avoid RLS issues with nested queries
      let leadTechnician = 'Não atribuído';
      let assistants: string[] = [];
      
      if (visit?.id) {
        console.log("Fetching technicians for visit:", visit.id);
        const { data: visitTechs, error: techError } = await supabase
          .from('visit_technicians')
          .select(`
            is_lead,
            technician_id,
            technicians (
              user_id,
              profiles:user_id (
                full_name
              )
            )
          `)
          .eq('visit_id', visit.id);

        if (techError) {
          console.error("Error fetching visit technicians:", techError);
        }
        console.log("Visit technicians result:", visitTechs);

        if (visitTechs) {
          const leadTechData = visitTechs.find((vt: any) => vt.is_lead);
          leadTechnician = leadTechData?.technicians?.profiles?.full_name || 'Não atribuído';
          
          assistants = visitTechs
            .filter((vt: any) => !vt.is_lead)
            .map((vt: any) => vt.technicians?.profiles?.full_name)
            .filter(Boolean);
        }
      }

      // Fetch company data
      let companyData = null;
      if (soData.company_id) {
        console.log("Fetching company with ID:", soData.company_id);
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name, email, phone, address, cnpj, cep, logo_url')
          .eq('id', soData.company_id)
          .maybeSingle();
        
        if (companyError) {
          console.error("Error fetching company:", companyError);
        }
        console.log("Company data result:", company);
        companyData = company;
      }

      const orderNumber = soData.order_number || osId;
      const so = soData as any;
      
      const serviceOrderDataObj = {
        id: orderNumber,
        orderNumber: orderNumber,
        clientReference: so.client_reference || undefined,
        serviceOrderId: so.id,
        vesselName: so.vessels?.name || '',
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
        service: fetchedTasks[0]?.taskTypeName || 'Serviço não especificado',
        taskTitle: fetchedTasks[0]?.title || fetchedTasks[0]?.taskTypeName || 'Tarefa',
        company: {
          name: companyData?.name?.trim() || 'Empresa não especificada',
          email: companyData?.email?.trim() || '',
          phone: companyData?.phone?.trim() || '',
          address: companyData?.address?.trim() || '',
          cnpj: companyData?.cnpj?.trim() || '',
          cep: companyData?.cep?.trim() || '',
          logoUrl: companyData?.logo_url?.trim() || '',
        },
      };

      console.log("Service order data prepared:", serviceOrderDataObj);
      setServiceOrderData(serviceOrderDataObj);
      setCurrentServiceOrderId(osId);
      
      // Set required photo labels from first task (for backward compatibility)
      const firstTaskPhotoLabels = fetchedTasks[0]?.photoLabels || [];
      setRequiredPhotoLabels(firstTaskPhotoLabels);
      console.log("Required photo labels:", firstTaskPhotoLabels);
      
      setTaskValidated(true);
      console.log("Service order validated successfully");
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
      // Determine OS ID: use serviceOrderId directly or get from legacyTaskId
      let osId = serviceOrderId;
      
      if (!osId && legacyTaskId) {
        // Backward compatibility: get service_order_id from task
        const { data: taskData } = await supabase
          .from('tasks')
          .select('service_order_id')
          .eq('id', legacyTaskId)
          .single();
        osId = taskData?.service_order_id || null;
      }

      if (!osId) {
        toast({
          title: "Erro de validação",
          description: "ID da OS não foi fornecido.",
          variant: "destructive",
        });
        navigate('/tech/tasks');
        return;
      }

      setIsLoading(true);
      await fetchServiceOrderData(osId);
    };
    loadData();
  }, [serviceOrderId, legacyTaskId]);

  // Second useEffect to initialize reports after tasks are loaded
  useEffect(() => {
    const initializeReports = async () => {
      if (!currentServiceOrderId || allTasks.length === 0) return;
      
      // Get valid task IDs from allTasks
      const validTaskIds = new Set(allTasks.map(t => t.id));
      
      // Check if we already have reports for all tasks (prevent re-initialization)
      const hasAllReports = allTasks.every(task => taskReports[task.id]);
      if (hasAllReports && Object.keys(taskReports).length === allTasks.length) {
        setIsLoading(false);
        if (!selectedTask) {
          setSelectedTask(allTasks[0].id);
        }
        return;
      }
      
      const savedReports = await fetchTaskReports(currentServiceOrderId, allTasks);
      if (!savedReports) {
        console.log("No saved reports found, initializing for all tasks");
        // Initialize reports for all tasks
        const initialReports: Record<string, TaskReport> = {};
        allTasks.forEach(task => {
          initialReports[task.id] = {
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
          };
        });
        setTaskReports(initialReports);
        setSelectedTask(allTasks[0].id);
      } else {
        // Filter saved reports to only include valid task IDs
        const filteredReports: Record<string, TaskReport> = {};
        for (const [taskId, report] of Object.entries(savedReports)) {
          if (validTaskIds.has(taskId)) {
            filteredReports[taskId] = report;
          }
        }
        setTaskReports(filteredReports);
        setSelectedTask(allTasks[0].id);
      }
      setIsLoading(false);
    };
    initializeReports();
  }, [currentServiceOrderId, allTasks.length]);

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

  // Sync timeEntries to time_entries table
  const syncTimeEntriesToDatabase = async (reportData: Record<string, TaskReport>, taskIdToSync: string) => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get technician_id for current user
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', currentUser.id)
        .single();

      if (!techData) {
        console.log("No technician found for current user, skipping time_entries sync");
        return;
      }

      for (const [_taskKey, report] of Object.entries(reportData)) {
        if (report.timeEntries && report.timeEntries.length > 0) {
          // Delete existing entries for this task/technician
          await supabase
            .from('time_entries')
            .delete()
            .eq('task_id', taskIdToSync)
            .eq('technician_id', techData.id);

          // Insert new entries
          const entries = report.timeEntries.map(entry => ({
            task_id: taskIdToSync,
            technician_id: techData.id,
            entry_type: entry.type || 'work_normal',
            entry_date: entry.date instanceof Date 
              ? entry.date.toISOString().split('T')[0] 
              : new Date(entry.date).toISOString().split('T')[0],
            start_time: entry.startTime,
            end_time: entry.endTime
          })).filter(e => e.start_time && e.end_time); // Only insert valid entries

          if (entries.length > 0) {
            const { error: insertError } = await supabase
              .from('time_entries')
              .insert(entries);

            if (insertError) {
              console.error("Error inserting time_entries:", insertError);
            } else {
              console.log(`Synced ${entries.length} time entries to database`);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing time entries:", error);
    }
  };

  // Function to save report history
  const saveReportHistory = async (
    reportId: string,
    action: 'created' | 'updated' | 'submitted',
    previousData: Record<string, any> | null,
    changes: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('task_report_history')
        .insert({
          report_id: reportId,
          edited_by: user.id,
          action,
          previous_data: previousData,
          changes
        });
      
      console.log("Report history saved:", { reportId, action });
    } catch (error) {
      console.error("Error saving report history:", error);
    }
  };

  const saveReportData = async (reportData: Record<string, TaskReport>, status: "draft" | "submitted") => {
    try {
      console.log("Starting report save process...");
      
      // First, save images to storage
      const reportDataWithStoragePaths = await saveImagesToStorage(reportData);
      
      console.log("Images saved, now saving report data to Supabase:", { osId: currentServiceOrderId, status });
      
      // Prepare serializable report data - only include storage paths for photos
      const serializableReportData: Record<string, any> = {};
      
      for (const [key, report] of Object.entries(reportDataWithStoragePaths)) {
        const { photos, ...reportWithoutFiles } = report;
        
        // Process photos to save storage paths, captions AND descriptions
        const photosData = photos.map(photo => ({
          caption: photo.caption,
          storagePath: photo.storagePath,
          description: photo.description || ""
        }));
        
        serializableReportData[key] = {
          ...reportWithoutFiles,
          photos: photosData
        };
      }
      
      // Get visit_id for the service order
      const visitId = await getVisitIdForTask(currentServiceOrderId!);

      // Check if report already exists to determine action and get previous data
      const { data: existingReport } = await supabase
        .from('task_reports')
        .select('id, report_data')
        .eq('task_uuid', currentServiceOrderId)
        .single();

      const isNewReport = !existingReport;
      const previousData = existingReport?.report_data as Record<string, any> | null;

      // Use upsert to prevent duplicates - use service order ID as unique key
      const { data: savedReport, error } = await supabase
        .from('task_reports')
        .upsert({
          task_id: currentServiceOrderId,
          task_uuid: currentServiceOrderId,
          visit_id: visitId,
          status: status,
          report_data: serializableReportData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'task_uuid'
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      console.log("Report data saved successfully");

      // Save to history
      if (savedReport?.id) {
        const historyAction = isNewReport ? 'created' : (status === 'submitted' ? 'submitted' : 'updated');
        await saveReportHistory(
          savedReport.id,
          historyAction,
          previousData,
          {
            status,
            sections_modified: Object.keys(serializableReportData),
            timestamp: new Date().toISOString()
          }
        );
      }

      // Sync timeEntries to time_entries table for productivity tracking
      await syncTimeEntriesToDatabase(reportDataWithStoragePaths, currentServiceOrderId!);
      
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
      
      // Update last edit info after save
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser?.id)
        .single();
      
      setLastEditInfo({
        editorName: profile?.full_name || 'Você',
        editedAt: new Date()
      });
      
      const pdfPath = await generateAndSavePDF(selectedTask, report, "draft");
      
      if (pdfPath) {
        const { data: existingReports } = await supabase
          .from('task_reports')
          .select('id')
          .eq('task_id', currentServiceOrderId)
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
    setShowValidation(true);
    
    // Validate ALL task reports
    for (const [taskId, report] of Object.entries(taskReports)) {
      const taskInfo = allTasks.find(t => t.id === taskId);
      const taskPhotoLabelsForTask = taskPhotoLabels[taskId] || [];
      const validation = validateTaskReport(report, taskPhotoLabelsForTask);
      
      if (!validation.isValid) {
        const taskName = taskInfo?.taskTypeName || 'Tarefa';
        toast({
          title: `Campos obrigatórios - ${taskName}`,
          description: validation.errors[0] || "Preencha todos os campos obrigatórios antes de enviar.",
          variant: "destructive",
        });
        // Navigate to the tab with errors
        setSelectedTask(taskId);
        return;
      }
    }
    
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
  const reportData = taskReports[selectedTask] || (currentServiceOrderId ? taskReports[currentServiceOrderId] : null);
  
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
          <TabsList className="flex-wrap h-auto gap-1">
            {allTasks.map((task) => {
              const report = taskReports[task.id];
              const hasContent = report && (
                report.modelInfo || report.executedWork || report.photos?.length > 0 || report.timeEntries?.length > 0
              );
              const isComplete = report && validateTaskReport(report, taskPhotoLabels[task.id] || []).isValid;
              
              return (
                <TabsTrigger 
                  key={task.id} 
                  value={task.id}
                  className="flex items-center gap-2"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    isComplete ? 'bg-green-500' : hasContent ? 'bg-yellow-500' : 'bg-muted-foreground/30'
                  }`} />
                  {task.taskTypeName}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Progress indicator and last edit info */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mt-2">
            {allTasks.length > 1 && (
              <div className="text-sm text-muted-foreground">
                {Object.entries(taskReports).filter(([taskId, report]) => 
                  validateTaskReport(report, taskPhotoLabels[taskId] || []).isValid
                ).length} de {allTasks.length} tarefas preenchidas
              </div>
            )}
            {lastEditInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
                <User className="h-3 w-3" />
                <span>Última edição por <strong>{lastEditInfo.editorName}</strong></span>
                <Clock className="h-3 w-3 ml-1" />
                <span>{lastEditInfo.editedAt.toLocaleString('pt-BR')}</span>
              </div>
            )}
          </div>

          {allTasks.map((task) => {
            const report = taskReports[task.id];
            if (!report) return null;
            
            return (
              <TabsContent key={task.id} value={task.id} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações do Equipamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EquipmentInfoSection
                      taskId={task.id}
                      report={report}
                      onUpdateReport={handleUpdateReport}
                      showValidation={showValidation}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detalhes do Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ServiceDetailsSection
                      taskId={task.id}
                      report={report}
                      onUpdateReport={handleUpdateReport}
                      showValidation={showValidation}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Fotos *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PhotosSection
                      taskId={task.id}
                      photos={report.photos}
                      onUpdatePhotos={handleUpdatePhotos}
                      requiredPhotoLabels={taskPhotoLabels[task.id] || []}
                      showValidation={showValidation}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Horários *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeEntriesSection
                      taskId={task.id}
                      timeEntries={report.timeEntries}
                      onAddTimeEntry={handleAddTimeEntry}
                      onRemoveTimeEntry={handleRemoveTimeEntry}
                      onUpdateTimeEntry={handleUpdateTimeEntry}
                      showValidation={showValidation}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
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
