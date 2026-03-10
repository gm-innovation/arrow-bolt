
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { TaskReport, TaskReportWithInfo } from './types';
import { CompanyHeader } from './pdf/CompanyHeader';
import { ServiceOrderInfo } from './pdf/ServiceOrderInfo';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from 'react';
import { PDFCanvasViewer } from '@/components/ui/PDFCanvasViewer';
import { Button } from '@/components/ui/button';
import { Download, Save, Eye, Image as ImageIcon } from 'lucide-react';
import { PhotoGalleryDialog } from './PhotoGalleryDialog';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 5,
    backgroundColor: '#f0f0f0',
    padding: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 15,
    backgroundColor: '#e0e0e0',
    padding: 8,
    textAlign: 'center',
  },
  taskDivider: {
    borderTopWidth: 2,
    borderTopColor: '#333',
    marginTop: 20,
    marginBottom: 10,
    paddingTop: 10,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  value: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: '35%',
    fontSize: 9,
    color: '#333',
  },
  fieldValue: {
    flex: 1,
    fontSize: 9,
    color: '#000',
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 3,
    marginBottom: 8,
    border: '1pt solid #e0e0e0',
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 0,
    color: '#444',
    textDecoration: 'underline',
  },
  photosGrid: {
    marginTop: 10,
  },
  photoRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  photoContainer: {
    width: '48%',
    display: 'flex',
    flexDirection: 'column',
  },
  photo: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
  },
  photoCaption: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  photoDescription: {
    fontSize: 8,
    marginTop: 3,
    textAlign: 'left',
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 4,
    borderRadius: 2,
    borderLeft: '2pt solid #666',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
  },
  photoCategory: {
    marginBottom: 15,
  },
  surveySection: {
    marginTop: 20,
    border: '1pt solid black',
    padding: 10,
  },
  surveyQuestion: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  checkbox: {
    width: 15,
    height: 15,
    border: '1pt solid black',
    marginLeft: 10,
  },
  commentsBox: {
    border: '1pt solid black',
    height: 100,
    marginTop: 10,
    marginBottom: 20,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderTop: '1pt solid black',
    marginTop: 50,
    marginBottom: 5,
  },
  signatureLabel: {
    textAlign: 'center',
  },
});

interface ReportPDFProps {
  report: TaskReport;
  taskId: string;
  serviceOrder: {
    id: string;
    clientReference?: string;
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
  };
}

interface MultiTaskReportPDFProps {
  tasks: TaskReportWithInfo[];
  serviceOrder: ReportPDFProps['serviceOrder'];
  photoBase64Data?: Record<string, PhotoWithBase64[]>;
}

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      console.log("Base64 conversion result:", result?.substring(0, 100) + "...");
      resolve(result);
    };
    reader.onerror = error => {
      console.error("Error converting file to base64:", error);
      reject(error);
    };
  });
};

// Helper function to save images to Supabase Storage
const saveImageToStorage = async (file: File, taskId: string, imageIndex: number): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${taskId}_image_${imageIndex}.${fileExt}`;
    const filePath = `${taskId}/${fileName}`;

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
    console.error(`Error in saveImageToStorage for image ${imageIndex + 1}:`, error);
    return null;
  }
};

// Helper function to get image from storage as base64
export const getImageFromStorage = async (imagePath: string): Promise<string | null> => {
  try {
    console.log("Getting image from storage:", imagePath);
    
    const { data, error } = await supabase.storage
      .from('reports')
      .download(imagePath);

    if (error) {
      console.error("Error downloading image from storage:", error);
      return null;
    }

    console.log("Image downloaded from storage, converting to base64...");
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        console.log("Image converted to base64 from storage");
        resolve(result);
      };
      reader.onerror = error => {
        console.error("Error converting downloaded image to base64:", error);
        reject(error);
      };
      reader.readAsDataURL(data);
    });
  } catch (error) {
    console.error("Error in getImageFromStorage:", error);
    return null;
  }
};

// Helper function to chunk array into groups
const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export interface PhotoWithBase64 {
  index: number;
  base64: string;
  photo: {
    caption: string;
    description?: string;
    file?: File;
    storagePath?: string;
  };
}

// Exported function to load photos from storage for external use
export const loadPhotosFromStorage = async (photos: Array<{ caption: string; description?: string; storagePath?: string; file?: File }>): Promise<PhotoWithBase64[]> => {
  if (!photos || photos.length === 0) {
    return [];
  }

  const photosWithBase64: PhotoWithBase64[] = [];
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    let base64String: string | null = null;
    
    if (photo.storagePath) {
      base64String = await getImageFromStorage(photo.storagePath);
    }
    
    if (base64String) {
      photosWithBase64.push({
        index: i,
        base64: base64String,
        photo: photo
      });
    }
  }
  
  return photosWithBase64;
};

// Exported function to generate PDF blob for single task (backward compatible)
export const generateReportPdfBlob = async (
  report: TaskReport,
  taskId: string,
  serviceOrder: ReportPDFProps['serviceOrder'],
  photoBase64Data: PhotoWithBase64[]
): Promise<Blob> => {
  const pdfDoc = <ReportPDFContent 
    report={report} 
    taskId={taskId} 
    serviceOrder={serviceOrder} 
    photoBase64Data={photoBase64Data}
  />;
  const asPdf = pdf();
  asPdf.updateContainer(pdfDoc);
  return await asPdf.toBlob();
};

// Exported function to generate PDF blob for multiple tasks
export const generateMultiTaskReportPdfBlob = async (
  tasks: TaskReportWithInfo[],
  serviceOrder: ReportPDFProps['serviceOrder'],
  photoBase64Data: Record<string, PhotoWithBase64[]>
): Promise<Blob> => {
  const pdfDoc = <MultiTaskReportPDFContent 
    tasks={tasks} 
    serviceOrder={serviceOrder} 
    photoBase64Data={photoBase64Data}
  />;
  const asPdf = pdf();
  asPdf.updateContainer(pdfDoc);
  return await asPdf.toBlob();
};

// Single task report section component for use in multi-task PDF
const TaskReportSection = ({ 
  task, 
  photoBase64Data,
  isFirstTask = false 
}: { 
  task: TaskReportWithInfo; 
  photoBase64Data?: PhotoWithBase64[];
  isFirstTask?: boolean;
}) => {
  const { report, taskName, orderNumber } = task;
  
  // Chunk photos into rows of 2
  const photoRows = useMemo(() => {
    if (!photoBase64Data) return [];
    return chunkArray(photoBase64Data, 2);
  }, [photoBase64Data]);

  return (
    <View style={!isFirstTask ? styles.taskDivider : undefined}>
      {/* Task Title */}
      <Text style={styles.taskTitle}>
        {taskName}{orderNumber ? ` - OS: ${orderNumber}` : ''}
      </Text>

      {/* Equipment Info */}
      <View style={styles.infoBox} wrap={false}>
        <Text style={styles.subSectionTitle}>Informações do Equipamento</Text>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Modelo:</Text>
          <Text style={styles.fieldValue}>{report.modelInfo || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Marca:</Text>
          <Text style={styles.fieldValue}>{report.brandInfo || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Número de Série:</Text>
          <Text style={styles.fieldValue}>{report.serialNumber || 'N/A'}</Text>
        </View>
      </View>
      
      {/* Diagnosis and Service */}
      <View style={styles.infoBox} wrap={false}>
        <Text style={styles.subSectionTitle}>Diagnóstico e Serviço</Text>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Defeito Encontrado:</Text>
          <Text style={styles.fieldValue}>{report.reportedIssue || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Trabalhos Executados:</Text>
          <Text style={styles.fieldValue}>{report.executedWork || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Resultado:</Text>
          <Text style={styles.fieldValue}>{report.result || 'N/A'}</Text>
        </View>
      </View>
      
      {/* Next Steps */}
      <View style={styles.infoBox} wrap={false}>
        <Text style={styles.subSectionTitle}>Próximos Passos</Text>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Próximo Atendimento:</Text>
          <Text style={styles.fieldValue}>{report.nextVisitWork || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.fieldLabel}>Material Fornecido:</Text>
          <Text style={styles.fieldValue}>{report.suppliedMaterial || 'N/A'}</Text>
        </View>
      </View>

      {/* Photos Section */}
      {photoBase64Data && photoBase64Data.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos - {taskName}</Text>
          <View style={styles.photosGrid}>
            {photoRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.photoRow} wrap={false}>
                {row.map(({ photo, index, base64 }) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image
                      src={base64}
                      style={styles.photo}
                      cache={false}
                    />
                    <Text style={styles.photoCaption}>
                      {photo.caption}
                    </Text>
                    {photo.description && (
                      <Text style={styles.photoDescription}>
                        {photo.description}
                      </Text>
                    )}
                  </View>
                ))}
                {row.length === 1 && <View style={styles.photoContainer} />}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Multi-task PDF Content
export const MultiTaskReportPDFContent = ({ tasks, serviceOrder, photoBase64Data }: MultiTaskReportPDFProps) => {
  // Get time entries from first task for header info
  const firstTaskTimeEntries = tasks[0]?.report.timeEntries || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <CompanyHeader company={serviceOrder.company} />
        
        <ServiceOrderInfo
          orderNumber={serviceOrder.id}
          clientReference={serviceOrder.clientReference}
          date={serviceOrder.date}
          location={serviceOrder.vesselName || serviceOrder.location}
          access={serviceOrder.access}
          requester={serviceOrder.requester}
          supervisor={serviceOrder.supervisor}
          team={serviceOrder.team}
          service={serviceOrder.service}
          timeEntries={firstTaskTimeEntries}
        />

        {/* All Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relatório Técnico</Text>
          
          {tasks.map((task, index) => (
            <TaskReportSection
              key={task.taskId}
              task={task}
              photoBase64Data={photoBase64Data?.[task.taskId]}
              isFirstTask={index === 0}
            />
          ))}
        </View>

        {/* Survey Section - Only once at the end */}
        <View style={styles.surveySection} wrap={false}>
          <Text style={styles.sectionTitle}>Pesquisa de Satisfação</Text>
          
          <View style={styles.surveyQuestion}>
            <Text>Satisfeito com o serviço prestado?</Text>
            <Text style={styles.checkbox}> </Text>
            <Text>Sim</Text>
            <Text style={styles.checkbox}> </Text>
            <Text>Não</Text>
          </View>

          <View style={styles.surveyQuestion}>
            <Text>Equipe cordial e educada?</Text>
            <Text style={styles.checkbox}> </Text>
            <Text>Sim</Text>
            <Text style={styles.checkbox}> </Text>
            <Text>Não</Text>
          </View>

          <Text>Comentários:</Text>
          <View style={styles.commentsBox} />

          <View style={styles.signatures}>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Assinatura do Cliente</Text>
            </View>
            <View style={styles.signatureBox}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Assinatura do Técnico</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Single task PDF Content (backward compatible)
export const ReportPDFContent = ({ report, taskId, serviceOrder, photoBase64Data }: ReportPDFProps & { photoBase64Data?: PhotoWithBase64[] }) => {
  // Create flat array with all photos and their base64 data
  const allPhotosWithBase64 = useMemo(() => {
    if (!photoBase64Data) return [];
    console.log("ReportPDFContent - Photos with base64:", photoBase64Data.length);
    photoBase64Data.forEach((item, idx) => {
      console.log(`Photo ${idx}: caption="${item.photo.caption}", description="${item.photo.description || 'N/A'}"`);
    });
    return photoBase64Data;
  }, [photoBase64Data]);

  // Chunk all photos into rows of 2
  const allPhotoRows = useMemo(() => {
    return chunkArray(allPhotosWithBase64, 2);
  }, [allPhotosWithBase64]);

  return (
  <Document>
    <Page size="A4" style={styles.page}>
      <CompanyHeader company={serviceOrder.company} />
      
      <ServiceOrderInfo
        orderNumber={serviceOrder.id}
        clientReference={serviceOrder.clientReference}
        date={serviceOrder.date}
        location={serviceOrder.vesselName || serviceOrder.location}
        access={serviceOrder.access}
        requester={serviceOrder.requester}
        supervisor={serviceOrder.supervisor}
        team={serviceOrder.team}
        service={serviceOrder.service}
        timeEntries={report.timeEntries}
      />

      {/* Technical Report Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relatório Técnico</Text>
        
        {/* Informações do Equipamento */}
        <View style={styles.infoBox} wrap={false}>
          <Text style={styles.subSectionTitle}>Informações do Equipamento</Text>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Modelo:</Text>
            <Text style={styles.fieldValue}>{report.modelInfo || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Marca:</Text>
            <Text style={styles.fieldValue}>{report.brandInfo || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Número de Série:</Text>
            <Text style={styles.fieldValue}>{report.serialNumber || 'N/A'}</Text>
          </View>
        </View>
        
        {/* Diagnóstico e Serviço */}
        <View style={styles.infoBox} wrap={false}>
          <Text style={styles.subSectionTitle}>Diagnóstico e Serviço</Text>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Defeito Encontrado:</Text>
            <Text style={styles.fieldValue}>{report.reportedIssue || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Trabalhos Executados:</Text>
            <Text style={styles.fieldValue}>{report.executedWork || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Resultado:</Text>
            <Text style={styles.fieldValue}>{report.result || 'N/A'}</Text>
          </View>
        </View>
        
        {/* Próximos Passos */}
        <View style={styles.infoBox} wrap={false}>
          <Text style={styles.subSectionTitle}>Próximos Passos</Text>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Próximo Atendimento:</Text>
            <Text style={styles.fieldValue}>{report.nextVisitWork || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.fieldLabel}>Material Fornecido:</Text>
            <Text style={styles.fieldValue}>{report.suppliedMaterial || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Photos Section - Two Columns (All Photos Together) */}
      {photoBase64Data && photoBase64Data.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos do Serviço</Text>
          <View style={styles.photosGrid}>
            {allPhotoRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.photoRow} wrap={false}>
                {row.map(({ photo, index, base64 }) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image
                      src={base64}
                      style={styles.photo}
                      cache={false}
                    />
                    <Text style={styles.photoCaption}>
                      {photo.caption}
                    </Text>
                    {photo.description && (
                      <Text style={styles.photoDescription}>
                        {photo.description}
                      </Text>
                    )}
                  </View>
                ))}
                {row.length === 1 && <View style={styles.photoContainer} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Survey Section */}
      <View style={styles.surveySection} wrap={false}>
        <Text style={styles.sectionTitle}>Pesquisa de Satisfação</Text>
        
        <View style={styles.surveyQuestion}>
          <Text>Satisfeito com o serviço prestado?</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Sim</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Não</Text>
        </View>

        <View style={styles.surveyQuestion}>
          <Text>Equipe cordial e educada?</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Sim</Text>
          <Text style={styles.checkbox}> </Text>
          <Text>Não</Text>
        </View>

        <Text>Comentários:</Text>
        <View style={styles.commentsBox} />

        <View style={styles.signatures}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Cliente</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Assinatura do Técnico</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
  );
};

export const ReportPDFViewer = ({ report, taskId, serviceOrder }: ReportPDFProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [photoBase64Data, setPhotoBase64Data] = useState<PhotoWithBase64[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const convertPhotosToBase64 = async (): Promise<PhotoWithBase64[]> => {
    if (!report.photos || report.photos.length === 0) {
      console.log("No photos to convert");
      return [];
    }

    console.log("=== Converting photos to base64 ===");
    console.log("Total photos:", report.photos.length);
    
    try {
      const photosWithBase64: PhotoWithBase64[] = [];
      
      for (let i = 0; i < report.photos.length; i++) {
        const photo = report.photos[i];
        let base64String: string | null = null;
        
        // Check if photo has a storage path (saved image)
        if (photo.storagePath) {
          console.log(`[Photo ${i + 1}] Loading from storage:`, photo.storagePath);
          base64String = await getImageFromStorage(photo.storagePath);
          if (base64String) {
            console.log(`[Photo ${i + 1}] ✅ Loaded from storage`);
          } else {
            console.warn(`[Photo ${i + 1}] ⚠️ Failed to load from storage`);
          }
        }
        
        // If no storage path or failed to load from storage, convert file
        if (!base64String && photo.file) {
          console.log(`[Photo ${i + 1}] Converting from file:`, photo.file.name, photo.file.type);
          
          // Validate file type
          if (!photo.file.type.startsWith('image/')) {
            console.warn(`[Photo ${i + 1}] ⚠️ Skipping non-image file`);
          } else {
            try {
              base64String = await fileToBase64(photo.file);
              if (base64String && base64String.length > 0) {
                console.log(`[Photo ${i + 1}] ✅ Converted from file`);
                
                // Save to storage for future use
                const storagePath = await saveImageToStorage(photo.file, taskId, i);
                if (storagePath) {
                  console.log(`[Photo ${i + 1}] ✅ Saved to storage:`, storagePath);
                }
              } else {
                console.warn(`[Photo ${i + 1}] ⚠️ Empty base64 result`);
              }
            } catch (error) {
              console.error(`[Photo ${i + 1}] ❌ Error converting:`, error);
            }
          }
        }
        
        // Only add if we successfully got base64
        if (base64String) {
          photosWithBase64.push({
            index: i,
            base64: base64String,
            photo: photo
          });
          console.log(`[Photo ${i + 1}] ✅ Added to array with caption: "${photo.caption}", description: "${photo.description || 'none'}"`);
        } else {
          console.warn(`[Photo ${i + 1}] ❌ Skipped - no base64 data`);
        }
      }
      
      console.log("=== Conversion complete ===");
      console.log("Successfully converted:", photosWithBase64.length, "out of", report.photos.length);
      
      return photosWithBase64;
    } catch (error) {
      console.error("Error in convertPhotosToBase64:", error);
      toast({
        title: "Erro ao processar imagens",
        description: "Não foi possível processar algumas imagens. O PDF será gerado sem elas.",
        variant: "destructive",
      });
      return [];
    }
  };

  const generatePdfBlob = async (base64Photos: PhotoWithBase64[]) => {
    try {
      console.log("Creating PDF document with", base64Photos.length, "photos...");
      const pdfDoc = <ReportPDFContent 
        report={report} 
        taskId={taskId} 
        serviceOrder={serviceOrder} 
        photoBase64Data={base64Photos}
      />;
      const asPdf = pdf();
      asPdf.updateContainer(pdfDoc);
      console.log("PDF document created, generating blob...");
      const blob = await asPdf.toBlob();
      console.log("Blob generated:", blob);
      return blob;
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      throw error;
    }
  };

  const generatePdfPreview = async () => {
    try {
      setIsGenerating(true);
      console.log("Starting PDF generation process...");
      console.log("Converting photos to base64...");
      const base64Photos = await convertPhotosToBase64();
      setPhotoBase64Data(base64Photos);
      
      console.log("Generating PDF with", base64Photos.length, "photos");
      const blob = await generatePdfBlob(base64Photos);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      console.log("PDF preview generated successfully");
    } catch (error) {
      console.error("Erro ao gerar preview do PDF:", error);
      toast({
        title: "Erro na visualização",
        description: "Não foi possível gerar o preview do PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generatePdfPreview();
    
    // Cleanup function to revoke the URL when component unmounts
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [report, taskId]);

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const blob = await generatePdfBlob(photoBase64Data);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download concluído",
        description: "O PDF foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao fazer download do PDF:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const savePdfToSupabase = async () => {
    try {
      setIsSaving(true);
      
      const blob = await generatePdfBlob(photoBase64Data);
      const fileName = `relatorio-${taskId}-${new Date().toISOString().split('T')[0]}.pdf`;
      
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
      
      toast({
        title: "Relatório salvo",
        description: "O PDF foi salvo com sucesso no servidor.",
      });
    } catch (error) {
      console.error("Erro ao salvar PDF no servidor:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o PDF no servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 justify-end flex-wrap">
        {report.photos && report.photos.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setIsGalleryOpen(true)}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Ver Fotos ({report.photos.length})
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={handleOpenInNewTab}
          disabled={!pdfUrl || isGenerating}
        >
          <Eye className="h-4 w-4 mr-2" />
          {isGenerating ? "Gerando..." : "Abrir em Nova Aba"}
        </Button>
        <Button 
          variant="outline" 
          onClick={handleDownloadPdf} 
          disabled={isDownloading}
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? "Baixando..." : "Baixar PDF"}
        </Button>
        <Button 
          onClick={savePdfToSupabase} 
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Salvando..." : "Salvar no Servidor"}
        </Button>
      </div>
      
      {isGenerating ? (
        <div className="flex items-center justify-center h-96 border border-gray-200 rounded">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Gerando PDF...</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <div className="border border-gray-200 rounded overflow-hidden">
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '600px', border: 'none' }}
            title="Visualização do PDF"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-96 border border-gray-200 rounded">
          <p className="text-muted-foreground">Erro ao carregar o PDF</p>
        </div>
      )}

      {report.photos && (
        <PhotoGalleryDialog
          open={isGalleryOpen}
          onOpenChange={setIsGalleryOpen}
          photos={report.photos}
        />
      )}
    </div>
  );
};
