import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using local file instead of CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export const useDocumentExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
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

  const extractFromPDF = async (file: File) => {
    setIsExtracting(true);
    try {
      // Convert PDF first page to image
      const imageBase64 = await pdfToImage(file);
      
      // Call edge function with image instead of PDF
      const { data, error } = await supabase.functions.invoke('extract-technician-data', {
        body: { 
          fileBase64: imageBase64,
          fileName: file.name 
        }
      });

      if (error) throw error;
      
      if (!data?.success || !data?.data) {
        throw new Error('Falha ao extrair dados do documento');
      }

      setExtractedData(data.data);
      
      toast({
        title: 'Dados extraídos com sucesso!',
        description: 'O formulário foi preenchido automaticamente.',
      });

      return data.data;
    } catch (error: any) {
      console.error('Document extraction error:', error);
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

  return { extractFromPDF, isExtracting, extractedData };
};
