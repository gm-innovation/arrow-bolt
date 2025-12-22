import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface AsoData {
  full_name?: string;
  cpf?: string;
  rg?: string;
  birth_date?: string;
  gender?: 'Masculino' | 'Feminino';
  nationality?: string;
  height?: number;
  blood_type?: 'A' | 'B' | 'AB' | 'O';
  blood_rh_factor?: 'Positivo' | 'Negativo';
  function?: string;
  sector?: string;
  aso_issue_date?: string;
  aso_valid_until?: string;
  medical_status?: 'fit' | 'unfit';
}

export interface CertificateData {
  certificate_name?: string;
  issue_date?: string;
  expiry_date?: string;
}

export interface ClassificationResult {
  document_type: 'aso' | 'certification' | 'unknown';
  confidence: number;
  aso_data?: AsoData;
  certificate_data?: CertificateData;
}

export const useDocumentClassification = () => {
  const [isClassifying, setIsClassifying] = useState(false);
  const { toast } = useToast();

  const fileToImage = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      // Convert PDF first page to image
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
    } else {
      // Already an image
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return base64String.split(',')[1];
    }
  };

  const classifyDocument = async (file: File): Promise<ClassificationResult | null> => {
    setIsClassifying(true);
    try {
      console.log('🔍 Classifying document by content:', file.name);
      
      // Convert to image
      const imageBase64 = await fileToImage(file);
      
      // Call edge function
      const { data, error } = await supabase.functions.invoke('classify-document', {
        body: { 
          fileBase64: imageBase64,
          fileName: file.name 
        }
      });

      if (error) throw error;
      
      if (!data?.success || !data?.data) {
        throw new Error('Falha ao classificar documento');
      }

      const result: ClassificationResult = data.data;
      console.log('✅ Classification result:', result.document_type, 'confidence:', result.confidence);

      return result;
    } catch (error: any) {
      console.error('Document classification error:', error);
      toast({
        title: 'Erro na classificação',
        description: 'Não foi possível classificar o documento. Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsClassifying(false);
    }
  };

  const classifyMultipleDocuments = async (files: File[]): Promise<Map<File, ClassificationResult>> => {
    setIsClassifying(true);
    const results = new Map<File, ClassificationResult>();
    
    try {
      // Process files in parallel with a limit
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(async (file) => {
          const result = await classifyDocument(file);
          return { file, result };
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ file, result }) => {
          if (result) {
            results.set(file, result);
          }
        });
      }
      
      return results;
    } finally {
      setIsClassifying(false);
    }
  };

  return { 
    classifyDocument, 
    classifyMultipleDocuments,
    isClassifying 
  };
};
