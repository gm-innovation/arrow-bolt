
import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer';
import { TaskReport } from './types';
import { CompanyHeader } from './pdf/CompanyHeader';
import { ServiceOrderInfo } from './pdf/ServiceOrderInfo';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Save, Eye } from 'lucide-react';

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
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  value: {
    flex: 1,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photoContainer: {
    width: '45%',
  },
  photo: {
    width: '100%',
    height: 150,
  },
  photoCaption: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
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
  };
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
const getImageFromStorage = async (imagePath: string): Promise<string | null> => {
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

export const ReportPDFContent = ({ report, taskId, serviceOrder, photoBase64Data }: ReportPDFProps & { photoBase64Data?: string[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <CompanyHeader />
      
      <ServiceOrderInfo
        orderNumber={serviceOrder.id}
        date={serviceOrder.date}
        location={serviceOrder.location}
        access={serviceOrder.access}
        requester={serviceOrder.requester}
        supervisor={serviceOrder.supervisor}
        team={serviceOrder.team}
        service={serviceOrder.service}
      />

      {/* Technical Report Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Relatório Técnico</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Modelo:</Text>
          <Text style={styles.value}>{report.modelInfo || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Marca:</Text>
          <Text style={styles.value}>{report.brandInfo || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Número de Série:</Text>
          <Text style={styles.value}>{report.serialNumber || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Defeito Encontrado:</Text>
          <Text style={styles.value}>{report.reportedIssue || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Trabalhos Executados:</Text>
          <Text style={styles.value}>{report.executedWork || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Resultado:</Text>
          <Text style={styles.value}>{report.result || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Próximo Atendimento:</Text>
          <Text style={styles.value}>{report.nextVisitWork || 'N/A'}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Material Fornecido:</Text>
          <Text style={styles.value}>{report.suppliedMaterial || 'N/A'}</Text>
        </View>
      </View>

      {/* Photos Section */}
      {photoBase64Data && photoBase64Data.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos do Serviço</Text>
          <View style={styles.photosGrid}>
            {photoBase64Data.map((base64Data, index) => {
              console.log(`Rendering image ${index + 1}:`, base64Data?.substring(0, 50) + "...");
              return (
                <View key={index} style={styles.photoContainer}>
                  <Image 
                    src={base64Data} 
                    style={styles.photo}
                    cache={false}
                  />
                  <Text style={styles.photoCaption}>
                    {report.photos[index]?.caption || `Foto ${index + 1}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Survey Section */}
      <View style={styles.surveySection}>
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

export const ReportPDFViewer = ({ report, taskId, serviceOrder }: ReportPDFProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [photoBase64Data, setPhotoBase64Data] = useState<string[]>([]);

  const convertPhotosToBase64 = async () => {
    if (!report.photos || report.photos.length === 0) {
      console.log("No photos to convert");
      return [];
    }

    console.log("Converting", report.photos.length, "photos to base64");
    
    try {
      const base64Photos: string[] = [];
      
      for (let i = 0; i < report.photos.length; i++) {
        const photo = report.photos[i];
        
        // Check if photo has a storage path (saved image)
        if (photo.storagePath) {
          console.log(`Loading photo ${i + 1} from storage:`, photo.storagePath);
          const base64FromStorage = await getImageFromStorage(photo.storagePath);
          if (base64FromStorage) {
            base64Photos.push(base64FromStorage);
            console.log(`Successfully loaded photo ${i + 1} from storage`);
            continue;
          }
        }
        
        // If no storage path or failed to load from storage, convert file
        if (photo.file) {
          console.log(`Converting photo ${i + 1} from file:`, photo.file.name, photo.file.type, photo.file.size);
          
          // Validate file type
          if (!photo.file.type.startsWith('image/')) {
            console.warn(`Skipping non-image file: ${photo.file.name}`);
            continue;
          }
          
          try {
            const base64String = await fileToBase64(photo.file);
            if (base64String && base64String.length > 0) {
              base64Photos.push(base64String);
              console.log(`Successfully converted photo ${i + 1} from file`);
              
              // Save to storage for future use
              const storagePath = await saveImageToStorage(photo.file, taskId, i);
              if (storagePath) {
                // Update the photo object with storage path (this would need to be handled by parent component)
                console.log(`Photo ${i + 1} saved to storage:`, storagePath);
              }
            } else {
              console.warn(`Empty base64 result for photo ${i + 1}`);
            }
          } catch (error) {
            console.error(`Error converting photo ${i + 1}:`, error);
          }
        }
      }
      
      console.log("Final base64Photos array length:", base64Photos.length);
      return base64Photos;
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

  const generatePdfBlob = async (base64Photos: string[]) => {
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
      <div className="flex gap-2 justify-end">
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
    </div>
  );
};
