import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface CertificateData {
  certificate_name?: string;
  issue_date?: string;
  expiry_date?: string;
}

export const useCertificateExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const pdfToImage = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    
    return canvas.toDataURL('image/png').split(',')[1];
  };

  const extractCertificateData = async (file: File): Promise<CertificateData | null> => {
    setIsExtracting(true);
    try {
      let imageBase64: string;

      if (file.type === 'application/pdf') {
        // Convert PDF first page to image
        imageBase64 = await pdfToImage(file);
      } else if (file.type.startsWith('image/')) {
        // Convert image file to base64
        const reader = new FileReader();
        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        throw new Error('Formato de arquivo não suportado');
      }
      
      // Call edge function for extraction
      const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
        body: { 
          fileBase64: imageBase64,
          fileName: file.name 
        }
      });

      if (error) throw error;
      
      if (!data?.success || !data?.data) {
        throw new Error('Falha ao extrair dados do certificado');
      }

      toast({
        title: 'Dados extraídos com sucesso!',
        description: `Certificado: ${data.data.certificate_name || 'Identificado'}`,
      });

      return data.data;
    } catch (error: any) {
      console.error('Certificate extraction error:', error);
      toast({
        title: 'Erro na extração',
        description: 'Não foi possível extrair os dados. Preencha manualmente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsExtracting(false);
    }
  };

  return { extractCertificateData, isExtracting };
};
