import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useDocumentExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();

  const extractFromPDF = async (file: File) => {
    setIsExtracting(true);
    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('extract-technician-data', {
        body: { 
          fileBase64: base64.split(',')[1], // Remove data:application/pdf;base64,
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return { extractFromPDF, isExtracting, extractedData };
};
