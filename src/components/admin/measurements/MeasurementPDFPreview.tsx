import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { MeasurementPDFContent } from './pdf/MeasurementPDFContent';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, ExternalLink, Save, Loader2 } from 'lucide-react';
import { TechnicianTimeEntry } from './MeasurementForm';
import { PDFCanvasViewer } from '@/components/ui/PDFCanvasViewer';

interface MeasurementPDFPreviewProps {
  measurement: any;
  serviceOrder: any;
  technicianTimeEntries: TechnicianTimeEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MeasurementPDFPreview = ({
  measurement,
  serviceOrder,
  technicianTimeEntries,
  open,
  onOpenChange,
}: MeasurementPDFPreviewProps) => {
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const generatePdfBlob = async () => {
    const blob = await pdf(
      <MeasurementPDFContent 
        measurement={measurement} 
        serviceOrder={serviceOrder} 
        technicianTimeEntries={technicianTimeEntries}
      />
    ).toBlob();
    return blob;
  };

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    try {
      const blob = await generatePdfBlob();
      setPdfBlob(blob);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
      toast({
        title: 'Erro ao gerar preview',
        description: 'Não foi possível gerar o preview do PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `medicao-final-${serviceOrder.order_number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF baixado',
        description: 'O PDF foi baixado com sucesso.',
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Erro ao baixar PDF',
        description: 'Não foi possível baixar o PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const blob = await generatePdfBlob();
      const fileName = `measurement-${measurement.id}.pdf`;
      const filePath = `measurements/${measurement.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update measurement with PDF path
      const { error: updateError } = await supabase
        .from('measurements')
        .update({ pdf_path: filePath })
        .eq('id', measurement.id);

      if (updateError) throw updateError;

      toast({
        title: 'PDF salvo',
        description: 'O PDF foi salvo com sucesso.',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving PDF:', error);
      toast({
        title: 'Erro ao salvar PDF',
        description: 'Não foi possível salvar o PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setPdfBlob(null);
    }
    onOpenChange(newOpen);
  };

  // Generate preview when dialog opens
  if (open && !pdfBlob && !isGenerating) {
    handleGeneratePreview();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preview da Medição Final - OS #{serviceOrder.order_number}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          {/* Preview Area */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-muted/50">
            {isGenerating ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Gerando preview...</p>
                </div>
              </div>
            ) : (
              <PDFCanvasViewer blob={pdfBlob} />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => pdfUrl && window.open(pdfUrl, '_blank')}
              disabled={!pdfUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir em Nova Aba
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!pdfUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button
              onClick={handleSave}
              disabled={!pdfUrl || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
