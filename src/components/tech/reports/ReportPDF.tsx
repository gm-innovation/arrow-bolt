
import { Document, Page, Text, View, StyleSheet, PDFViewer, Image, pdf, PDFDownloadLink } from '@react-pdf/renderer';
import { TaskReport } from './types';
import { CompanyHeader } from './pdf/CompanyHeader';
import { ServiceOrderInfo } from './pdf/ServiceOrderInfo';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Save } from 'lucide-react';

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

export const ReportPDFContent = ({ report, taskId, serviceOrder }: ReportPDFProps) => (
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
      {report.photos && report.photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos do Serviço</Text>
          <View style={styles.photosGrid}>
            {report.photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image src={URL.createObjectURL(photo.file)} style={styles.photo} />
                <Text style={styles.photoCaption}>{photo.caption}</Text>
              </View>
            ))}
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

  const generatePdfBlob = async () => {
    try {
      const pdfDoc = <ReportPDFContent report={report} taskId={taskId} serviceOrder={serviceOrder} />;
      const asPdf = pdf();
      asPdf.updateContainer(pdfDoc);
      const blob = await asPdf.toBlob();
      return blob;
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      throw error;
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const blob = await generatePdfBlob();
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
      const blob = await generatePdfBlob();
      
      const fileName = `relatorio-${taskId}-${new Date().toISOString()}.pdf`;
      const filePath = `${taskId}/${fileName}`;
      
      const { error } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'application/pdf'
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }
      
      toast({
        title: "Relatório salvo",
        description: "O PDF foi salvo com sucesso no servidor.",
      });
    } catch (error) {
      console.error("Erro ao salvar PDF no Supabase:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o PDF no servidor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 justify-end">
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
      <PDFViewer style={{ width: '100%', height: '600px' }}>
        <ReportPDFContent report={report} taskId={taskId} serviceOrder={serviceOrder} />
      </PDFViewer>
    </div>
  );
};
