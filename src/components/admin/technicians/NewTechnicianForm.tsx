import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast as sonnerToast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentUploadZone } from "./DocumentUploadZone";
import { useDocumentClassification, ClassificationResult } from "@/hooks/useDocumentClassification";
import { Eye, EyeOff, Sparkles, CheckCircle2, XCircle, Loader2, FileText, Trash2, Copy, KeyRound, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ResetPasswordSection } from "./ResetPasswordSection";

const technicianFormSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20).optional().or(z.literal("")),
  
  // Novos campos do ASO
  cpf: z.string().trim().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)").optional().or(z.literal("")),
  rg: z.string().trim().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(['Masculino', 'Feminino']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  nationality: z.string().trim().optional().or(z.literal("")),
  height: z.string().optional().or(z.literal("")),
  blood_type: z.enum(['A', 'B', 'AB', 'O']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  blood_rh_factor: z.enum(['Positivo', 'Negativo']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  aso_issue_date: z.string().optional().or(z.literal("")),
  aso_valid_until: z.string().optional().or(z.literal("")),
  medical_status: z.enum(['fit', 'unfit', 'pending']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  
  // Dados profissionais
  role: z.string().trim().min(1, "Cargo é obrigatório"),
  
  // Senha
  password_option: z.enum(['auto_email', 'manual', 'reset_link']),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional().or(z.literal("")),
  
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.password_option === 'manual' && (!data.password || data.password.length < 8)) {
    return false;
  }
  return true;
}, {
  message: "Senha é obrigatória quando 'Definir senha temporária' está selecionado",
  path: ["password"],
});

type TechnicianFormValues = z.infer<typeof technicianFormSchema>;

interface NewTechnicianFormProps {
  onSubmit: (data: TechnicianFormValues, uploadedFile: File | null, photoFile: File | null, certificationFiles: Array<{
    file: File;
    name?: string;
    issueDate?: string;
    expiryDate?: string;
  }>) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TechnicianFormValues> & {
    avatar_url?: string;
    documents?: Array<{
      id: string;
      file_name: string;
      certificate_name?: string;
      issue_date?: string;
      expiry_date?: string;
      document_type: string;
      file_path: string;
    }>;
  };
  isEditing?: boolean;
}

export const NewTechnicianForm = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}: NewTechnicianFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    aso?: File;
    photo?: File;
    certifications: Array<{
      file: File;
      name?: string;
      issueDate?: string;
      expiryDate?: string;
      isValid?: boolean;
    }>;
  }>({ certifications: [] });
  const [photoPreview, setPhotoPreview] = useState<string>(initialData?.avatar_url || "");
  const [existingDocuments, setExistingDocuments] = useState<Array<{
    id: string;
    file_name: string;
    certificate_name?: string;
    issue_date?: string;
    expiry_date?: string;
    document_type: string;
    file_path: string;
  }>>(initialData?.documents || []);
  const [isProcessing, setIsProcessing] = useState(false);
  const { classifyDocument, isClassifying } = useDocumentClassification();
  const { toast } = useToast();

  // Sync existingDocuments when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData?.documents) {
      setExistingDocuments(initialData.documents);
    }
  }, [initialData?.documents]);

  // Sync photoPreview when initialData.avatar_url changes
  useEffect(() => {
    if (initialData?.avatar_url) {
      setPhotoPreview(initialData.avatar_url);
    }
  }, [initialData?.avatar_url]);

  // Update existing document metadata
  const updateExistingDocument = (index: number, field: string, value: string) => {
    setExistingDocuments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const form = useForm<TechnicianFormValues>({
    resolver: zodResolver(technicianFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      cpf: initialData?.cpf || "",
      rg: initialData?.rg || "",
      birth_date: initialData?.birth_date || "",
      gender: initialData?.gender || undefined,
      nationality: initialData?.nationality || "",
      height: initialData?.height || "",
      blood_type: initialData?.blood_type || undefined,
      blood_rh_factor: initialData?.blood_rh_factor || undefined,
      aso_issue_date: initialData?.aso_issue_date || "",
      aso_valid_until: initialData?.aso_valid_until || "",
      medical_status: initialData?.medical_status || undefined,
      role: initialData?.role || "",
      password_option: 'auto_email',
      password: "",
      isActive: initialData?.isActive ?? true,
    },
  });

  // Limpar autofill incorreto quando "Definir senha temporária" for selecionado
  const passwordOption = form.watch("password_option");
  useEffect(() => {
    if (passwordOption === 'manual') {
      const currentPhone = form.getValues("phone");
      // Se o telefone contém @ (email), limpa - é autofill incorreto
      if (currentPhone && currentPhone.includes('@')) {
        form.setValue("phone", "");
      }
      // Limpa a senha para evitar autofill do navegador
      form.setValue("password", "");
    }
  }, [passwordOption, form]);

  const processCertificate = async (file: File) => {
    // Fallback: usar nome do arquivo como nome do certificado
    const fallbackName = file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, '').replace(/_/g, ' ');
    
    try {
      console.log('📜 Processing certificate:', file.name);
      
      // Convert file to image if PDF
      let imageBase64: string;
      
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          console.warn(`⚠️ Could not get canvas context for ${file.name}, using fallback`);
          return { certificate_name: fallbackName };
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        imageBase64 = canvas.toDataURL('image/png').split(',')[1];
      } else {
        // Already an image
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imageBase64 = base64String.split(',')[1];
      }

      console.log('📜 Calling extract-certificate-data function for:', file.name);
      const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
        body: { 
          fileBase64: imageBase64,
          fileName: file.name 
        }
      });

      if (error) {
        console.error(`❌ Certificate extraction error for ${file.name}:`, error);
        toast({
          title: "Aviso",
          description: `Não foi possível extrair dados de "${file.name}". O certificado será salvo com nome do arquivo.`,
        });
        return { certificate_name: fallbackName };
      }
      
      const extractedData = data?.data || {};
      console.log('✅ Certificate data extracted:', extractedData);
      
      // Garantir que sempre tenha um nome
      if (!extractedData.certificate_name) {
        extractedData.certificate_name = fallbackName;
      }
      
      return extractedData;
    } catch (error) {
      console.error(`❌ Certificate extraction error for ${file.name}:`, error);
      toast({
        title: "Aviso",
        description: `Erro ao processar "${file.name}". O certificado será salvo com nome do arquivo.`,
      });
      return { certificate_name: fallbackName };
    }
  };

  const handleFilesSelect = async (files: FileList | null) => {
    if (!files) return;

    setIsProcessing(true);
    const fileArray = Array.from(files);
    const newFiles = { ...uploadedFiles };

    let asoPdf: File | null = null;
    let asoData: ClassificationResult['aso_data'] | null = null;
    let photoProcessedThisBatch = false; // Flag para rastrear se já processamos foto neste lote
    
    const certifications: Array<{
      file: File;
      name?: string;
      issueDate?: string;
      expiryDate?: string;
      isValid?: boolean;
    }> = [];

    // Processar arquivos: imagens primeiro (foto), depois documentos (PDF/imagem)
    for (const file of fileArray) {
      const fileType = file.type;

      if (fileType.startsWith('image/')) {
        // Primeira imagem deste lote é a foto (permite substituição)
        if (!photoProcessedThisBatch) {
          photoProcessedThisBatch = true;
          newFiles.photo = file;
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          // Imagem adicional: classificar pelo conteúdo
          console.log('🔍 Classificando imagem pelo conteúdo:', file.name);
          const classification = await classifyDocument(file);
          
          if (classification?.document_type === 'aso' && !asoPdf && !newFiles.aso) {
            // É um ASO
            asoPdf = file;
            asoData = classification.aso_data;
            console.log('✅ Imagem classificada como ASO:', file.name);
          } else if (classification?.document_type === 'certification' || classification?.document_type === 'unknown') {
            // É uma certificação ou desconhecido (tratar como certificação)
            certifications.push({
              file,
              name: classification?.certificate_data?.certificate_name || file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, ''),
              issueDate: classification?.certificate_data?.issue_date,
              expiryDate: classification?.certificate_data?.expiry_date,
              isValid: classification?.certificate_data?.expiry_date 
                ? new Date(classification.certificate_data.expiry_date) >= new Date() 
                : undefined
            });
            console.log('✅ Imagem classificada como certificação:', file.name);
          }
        }
      } else if (fileType === 'application/pdf') {
        // PDF: classificar pelo conteúdo usando IA
        console.log('🔍 Classificando PDF pelo conteúdo:', file.name);
        const classification = await classifyDocument(file);
        
        if (classification?.document_type === 'aso' && !asoPdf && !newFiles.aso) {
          // É um ASO
          asoPdf = file;
          asoData = classification.aso_data;
          console.log('✅ PDF classificado como ASO:', file.name);
          
          toast({
            title: "ASO identificado",
            description: `O documento "${file.name}" foi identificado como ASO.`,
          });
        } else if (classification?.document_type === 'certification') {
          // É uma certificação
          certifications.push({
            file,
            name: classification.certificate_data?.certificate_name || file.name.replace(/\.pdf$/i, ''),
            issueDate: classification.certificate_data?.issue_date,
            expiryDate: classification.certificate_data?.expiry_date,
            isValid: classification.certificate_data?.expiry_date 
              ? new Date(classification.certificate_data.expiry_date) >= new Date() 
              : undefined
          });
          console.log('✅ PDF classificado como certificação:', file.name);
        } else if (classification?.document_type === 'unknown') {
          // Tipo desconhecido: se não temos ASO ainda, assume que é ASO
          if (!asoPdf && !newFiles.aso) {
            asoPdf = file;
            asoData = classification.aso_data;
            console.log('⚠️ PDF não identificado, assumindo como ASO:', file.name);
            
            toast({
              title: "Documento não identificado",
              description: `"${file.name}" será tratado como ASO por ser o primeiro documento.`,
            });
          } else {
            // Já temos ASO, tratar como certificação
            certifications.push({
              file,
              name: file.name.replace(/\.pdf$/i, ''),
              issueDate: undefined,
              expiryDate: undefined,
              isValid: undefined
            });
            console.log('⚠️ PDF não identificado, tratando como certificação:', file.name);
          }
        }
      }
    }

    // Preencher formulário com dados do ASO se encontrado
    if (asoPdf) {
      newFiles.aso = asoPdf;
      
      if (asoData) {
        if (asoData.full_name) form.setValue('name', asoData.full_name);
        if (asoData.cpf) form.setValue('cpf', asoData.cpf);
        if (asoData.rg) form.setValue('rg', asoData.rg);
        if (asoData.birth_date) form.setValue('birth_date', asoData.birth_date);
        if (asoData.gender) form.setValue('gender', asoData.gender);
        if (asoData.nationality) form.setValue('nationality', asoData.nationality);
        if (asoData.height) form.setValue('height', asoData.height.toString());
        if (asoData.blood_type) form.setValue('blood_type', asoData.blood_type);
        if (asoData.blood_rh_factor) form.setValue('blood_rh_factor', asoData.blood_rh_factor);
        if (asoData.aso_issue_date) {
          console.log('📅 Setting aso_issue_date from classification:', asoData.aso_issue_date);
          form.setValue('aso_issue_date', asoData.aso_issue_date);
        }
        if (asoData.aso_valid_until) form.setValue('aso_valid_until', asoData.aso_valid_until);
        if (asoData.medical_status) form.setValue('medical_status', asoData.medical_status);
        if (asoData.function) form.setValue('role', asoData.function);
        
        toast({
          title: "Dados extraídos com sucesso!",
          description: "O formulário foi preenchido automaticamente com os dados do ASO.",
        });
      }
    }

    // Adicionar certificações
    newFiles.certifications = [...newFiles.certifications, ...certifications];

    console.log('========================================');
    console.log('📁 ARQUIVOS PROCESSADOS (handleFilesSelect):');
    console.log('========================================');
    console.log('  ASO:', newFiles.aso?.name || 'nenhum');
    console.log('  Foto:', newFiles.photo?.name || 'nenhuma');
    console.log('  Certificações:', newFiles.certifications.length);
    newFiles.certifications.forEach((cert, i) => {
      console.log(`    [${i+1}] ${cert.file?.name} - hasFile: ${!!cert.file}`);
    });
    console.log('========================================');

    if (certifications.length > 0) {
      toast({
        title: "Certificações adicionadas",
        description: `${certifications.length} certificação(ões) pronta(s) para envio.`,
      });
    }

    setUploadedFiles(newFiles);
    setIsProcessing(false);
  };

  const removeFile = (type: 'aso' | 'photo' | 'certification', index?: number) => {
    const newFiles = { ...uploadedFiles };
    if (type === 'aso') {
      delete newFiles.aso;
    } else if (type === 'photo') {
      delete newFiles.photo;
      if (isEditing) {
        setPhotoPreview("");
      } else {
        setPhotoPreview("");
      }
    } else if (type === 'certification' && index !== undefined) {
      newFiles.certifications = newFiles.certifications.filter((_, i) => i !== index);
    }
    setUploadedFiles(newFiles);
  };

  const removeExistingDocument = async (docId: string, docType: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('technician_documents')
        .delete()
        .eq('id', docId);
      
      if (error) throw error;
      
      setExistingDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      toast({
        title: "Documento removido",
        description: "O documento foi removido com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover documento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: TechnicianFormValues) => {
    setIsLoading(true);
    try {
      console.log('========================================');
      console.log('🚀 FORM SUBMIT INICIADO');
      console.log('========================================');
      console.log('📋 Data:', JSON.stringify({ name: data.name, email: data.email, role: data.role }, null, 2));
      console.log('📁 Estado atual de uploadedFiles:');
      console.log('  - aso:', uploadedFiles.aso?.name || 'null');
      console.log('  - photo:', uploadedFiles.photo?.name || 'null');
      console.log('  - certifications:', uploadedFiles.certifications.length, 'arquivo(s)');
      
      // Log detalhado das certificações
      if (uploadedFiles.certifications.length > 0) {
        console.log('📜 Detalhes das certificações:');
        uploadedFiles.certifications.forEach((cert, index) => {
          console.log(`  [${index + 1}] ${cert.file?.name || 'SEM ARQUIVO'}`);
          console.log(`      hasFile: ${!!cert.file}`);
          console.log(`      file type: ${cert.file?.type || 'N/A'}`);
          console.log(`      file size: ${cert.file ? (cert.file.size/1024).toFixed(1) + 'KB' : 'N/A'}`);
          console.log(`      name: ${cert.name || 'N/A'}`);
        });
      } else {
        console.log('⚠️ NENHUMA CERTIFICAÇÃO no estado!');
      }
      
      // Filtrar apenas certificações com arquivo válido
      const validCertifications = uploadedFiles.certifications.filter(cert => {
        const isValid = !!cert.file;
        if (!isValid) {
          console.warn(`⚠️ Certificação sem arquivo válido ignorada:`, cert);
        }
        return isValid;
      });
      
      if (validCertifications.length !== uploadedFiles.certifications.length) {
        console.warn(`⚠️ ${uploadedFiles.certifications.length - validCertifications.length} certificação(ões) sem arquivo válido foram ignoradas`);
      }
      
      console.log(`✅ Enviando para onSubmit:`);
      console.log(`  - asoFile: ${uploadedFiles.aso?.name || 'null'}`);
      console.log(`  - photoFile: ${uploadedFiles.photo?.name || 'null'}`);
      console.log(`  - certifications: ${validCertifications.length} arquivo(s)`);
      
      if (validCertifications.length > 0) {
        toast({
          title: "Enviando documentos...",
          description: `${validCertifications.length} certificação(ões) sendo enviada(s)`,
        });
      }

      // Update existing documents metadata in database (edit mode)
      if (isEditing && existingDocuments.length > 0) {
        console.log('📝 Atualizando metadados de documentos existentes...');
        for (const doc of existingDocuments) {
          const { error } = await supabase
            .from('technician_documents')
            .update({
              certificate_name: doc.certificate_name,
              issue_date: doc.issue_date || null,
              expiry_date: doc.expiry_date || null,
            })
            .eq('id', doc.id);
          
          if (error) {
            console.error('Erro ao atualizar documento:', error);
          } else {
            console.log(`✅ Documento ${doc.certificate_name || doc.file_name} atualizado`);
          }
        }
      }
      
      await onSubmit(data, uploadedFiles.aso || null, uploadedFiles.photo || null, validCertifications);
      
      console.log('✅ onSubmit completado com sucesso');
      
      form.reset();
      setUploadedFiles({ certifications: [] });
      setPhotoPreview("");
    } catch (error: any) {
      console.error('❌ Erro no handleSubmit:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar formulário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" autoComplete="off">
        {/* Campos ocultos para capturar autofill do navegador */}
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
          <input type="text" name="fake_username" tabIndex={-1} autoComplete="username" />
          <input type="password" name="fake_password" tabIndex={-1} autoComplete="current-password" />
        </div>

        {/* Upload section - sempre visível agora */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              📁 {isEditing ? "Atualizar Documentos" : "Upload de Documentos"}
            </h3>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".pdf,image/*"
                multiple
                onChange={(e) => {
                  handleFilesSelect(e.target.files);
                  // Resetar valor para permitir re-selecionar o mesmo arquivo
                  e.target.value = '';
                }}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Arraste ou selecione: ASO (PDF), Foto (JPG/PNG), Certificações (PDF/Imagens)
              </p>
              {!isEditing && (
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Nomeie o ASO com "aso" no nome para identificação automática
                </p>
              )}
            </div>
          </div>

          {/* Mostrar foto atual (modo edição) */}
          {isEditing && photoPreview && !uploadedFiles.photo && (
            <div>
              <p className="text-sm font-semibold mb-2">📷 Foto Atual</p>
              <div className="flex items-center gap-4 p-3 bg-muted rounded border">
                <img 
                  src={photoPreview} 
                  alt="Foto atual" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Foto do técnico</p>
                  <p className="text-xs text-muted-foreground">
                    Faça upload de uma nova imagem para substituir
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mostrar documentos existentes (modo edição) - Campos editáveis */}
          {isEditing && existingDocuments.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Documentos Existentes (editáveis)</p>
              {existingDocuments.map((doc, index) => (
                <div key={doc.id} className="p-4 bg-muted rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {doc.document_type === 'aso' ? 'ASO' : 'Certificação'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExistingDocument(doc.id, doc.document_type)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Nome do Documento - Editável */}
                  <div className="grid gap-2">
                    <Label className="text-xs">Nome do Documento</Label>
                    <Input
                      value={doc.certificate_name || doc.file_name || ''}
                      onChange={(e) => updateExistingDocument(index, 'certificate_name', e.target.value)}
                      placeholder="Nome do certificado"
                    />
                  </div>
                  
                  {/* Datas lado a lado */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs">Data de Emissão</Label>
                      <Input
                        type="date"
                        value={doc.issue_date || ''}
                        onChange={(e) => updateExistingDocument(index, 'issue_date', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Data de Validade</Label>
                      <Input
                        type="date"
                        value={doc.expiry_date || ''}
                        onChange={(e) => updateExistingDocument(index, 'expiry_date', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Arquivo: {doc.file_name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Mostrar arquivos carregados */}
          <div className="space-y-3">
            {uploadedFiles.aso && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">ASO: {uploadedFiles.aso.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isEditing ? 'Novo arquivo - substituirá o anterior' : 'Dados extraídos automaticamente'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('aso')}
                >
                  Remover
                </Button>
              </div>
            )}

            {uploadedFiles.photo && (
              <div>
                <p className="text-sm font-semibold mb-2">
                  📷 {isEditing ? 'Nova Foto' : 'Foto do Técnico'}
                </p>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-4">
                    {photoPreview && (
                      <div className="relative">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-20 h-20 rounded-full object-cover border-4 border-blue-400"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{uploadedFiles.photo.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFiles.photo.size / 1024 / 1024).toFixed(2)} MB
                        {isEditing && ' - Substituirá a foto anterior'}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('photo')}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}

            {uploadedFiles.certifications.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">
                  {isEditing ? 'Novas Certificações' : 'Certificações'} ({uploadedFiles.certifications.length})
                </p>
                {uploadedFiles.certifications.map((cert, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded border ${
                      cert.isValid === true 
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                        : cert.isValid === false 
                        ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {cert.isValid === true && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                        {cert.isValid === false && <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cert.name || cert.file.name}
                          </p>
                          {(cert.issueDate || cert.expiryDate) && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {cert.issueDate && (
                                <p>Emissão: {new Date(cert.issueDate).toLocaleDateString('pt-BR')}</p>
                              )}
                              {cert.expiryDate && (
                                <p>Validade: {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('certification', index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando documentos...</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📝 Dados Pessoais</h3>
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome do técnico" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="000.000.000-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="RG/Identidade" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidade</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Brasil" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="170" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">💼 Contato e Acesso</h3>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="email" 
                    placeholder="email@empresa.com" 
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="tel" 
                    inputMode="tel"
                    placeholder="(00) 00000-0000" 
                    autoComplete="tel-national"
                    spellCheck={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isEditing && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">🔐 Credenciais de Acesso</h3>
            
            <FormField
              control={form.control}
              name="password_option"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto_email" id="auto_email" />
                        <Label htmlFor="auto_email" className="font-normal cursor-pointer">
                          Gerar senha e enviar por email
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual" />
                        <Label htmlFor="manual" className="font-normal cursor-pointer">
                          Definir senha temporária
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="reset_link" id="reset_link" />
                        <Label htmlFor="reset_link" className="font-normal cursor-pointer">
                          Enviar link para técnico definir senha
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {passwordOption === 'manual' && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Temporária *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {isEditing && initialData && (
          <ResetPasswordSection userId={(initialData as any).user_id} />
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🩺 Dados Médicos (Opcional)</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="blood_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Sanguíneo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="AB">AB</SelectItem>
                      <SelectItem value="O">O</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blood_rh_factor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fator RH</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Positivo">Positivo</SelectItem>
                      <SelectItem value="Negativo">Negativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="aso_valid_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validade do ASO</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medical_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Médico</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fit">Apto</SelectItem>
                      <SelectItem value="unfit">Inapto</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">💼 Dados Profissionais</h3>
          
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ex: Técnico de Eletrônica" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Técnico ativo no sistema
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || isClassifying}>
            {isLoading ? "Processando..." : isEditing ? "Atualizar" : "Criar Técnico e Usuário"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
