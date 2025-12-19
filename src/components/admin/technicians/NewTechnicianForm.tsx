import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DocumentUploadZone } from "./DocumentUploadZone";
import { useDocumentExtraction } from "@/hooks/useDocumentExtraction";
import { Eye, EyeOff, Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { extractFromPDF, isExtracting } = useDocumentExtraction();
  const { toast } = useToast();

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

    const pdfCount = fileArray.filter((f) => f.type === 'application/pdf').length;
    const hasMultiplePdfs = pdfCount > 1;

    let asoPdf: File | null = null;
    const certifications: Array<{
      file: File;
      name?: string;
      issueDate?: string;
      expiryDate?: string;
      isValid?: boolean;
    }> = [];

    // Primeiro, separar arquivos por tipo
    for (const file of fileArray) {
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType.startsWith('image/')) {
        // Primeira imagem é a foto
        if (!newFiles.photo) {
          newFiles.photo = file;
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          // Processar como certificação
          const certData = await processCertificate(file);
          certifications.push({
            file,
            name: certData.certificate_name,
            issueDate: certData.issue_date,
            expiryDate: certData.expiry_date,
            isValid: certData.expiry_date ? new Date(certData.expiry_date) >= new Date() : undefined
          });
        }
      } else if (fileType === 'application/pdf') {
        // ASO: apenas se o nome indicar explicitamente ("aso") OU se houver apenas 1 PDF na seleção.
        // Isso evita classificar NRs como ASO quando o usuário faz upload de várias certificações.
        const isAsoByName = fileName.includes('aso');
        const shouldTreatAsAso = isAsoByName || (!hasMultiplePdfs && !asoPdf && !newFiles.aso);

        if (shouldTreatAsAso) {
          asoPdf = file;
        } else {
          const certData = await processCertificate(file);
          certifications.push({
            file,
            name: certData.certificate_name,
            issueDate: certData.issue_date,
            expiryDate: certData.expiry_date,
            isValid: certData.expiry_date ? new Date(certData.expiry_date) >= new Date() : undefined
          });
        }
      }
    }

    // Processar ASO se encontrado
    if (asoPdf && !newFiles.aso) {
      newFiles.aso = asoPdf;
      const extractedData = await extractFromPDF(asoPdf);
      if (extractedData) {
        if (extractedData.full_name) form.setValue('name', extractedData.full_name);
        if (extractedData.cpf) form.setValue('cpf', extractedData.cpf);
        if (extractedData.rg) form.setValue('rg', extractedData.rg);
        if (extractedData.birth_date) form.setValue('birth_date', extractedData.birth_date);
        if (extractedData.gender) form.setValue('gender', extractedData.gender);
        if (extractedData.nationality) form.setValue('nationality', extractedData.nationality);
        if (extractedData.height) form.setValue('height', extractedData.height.toString());
        if (extractedData.blood_type) form.setValue('blood_type', extractedData.blood_type);
        if (extractedData.blood_rh_factor) form.setValue('blood_rh_factor', extractedData.blood_rh_factor);
        if (extractedData.aso_issue_date) {
          console.log('📅 Setting aso_issue_date from extracted data:', extractedData.aso_issue_date);
          form.setValue('aso_issue_date', extractedData.aso_issue_date);
        }
        if (extractedData.aso_valid_until) form.setValue('aso_valid_until', extractedData.aso_valid_until);
        if (extractedData.medical_status) form.setValue('medical_status', extractedData.medical_status);
        if (extractedData.function) form.setValue('role', extractedData.function);
      }
    }

    // Adicionar certificações
    newFiles.certifications = [...newFiles.certifications, ...certifications];

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
      console.log('🚀 Form submit - Data completa:', JSON.stringify(data, null, 2));
      console.log('🚀 Form submit - aso_issue_date:', data.aso_issue_date);
      
      // Log detalhado das certificações
      console.log('📜 Total de certificações no formulário:', uploadedFiles.certifications.length);
      uploadedFiles.certifications.forEach((cert, index) => {
        console.log(`📜 Certificação ${index + 1}:`, {
          fileName: cert.file?.name,
          name: cert.name,
          hasFile: !!cert.file,
          issueDate: cert.issueDate,
          expiryDate: cert.expiryDate
        });
      });
      
      // Filtrar apenas certificações com arquivo válido
      const validCertifications = uploadedFiles.certifications.filter(cert => cert.file);
      
      if (validCertifications.length !== uploadedFiles.certifications.length) {
        console.warn(`⚠️ ${uploadedFiles.certifications.length - validCertifications.length} certificação(ões) sem arquivo válido foram ignoradas`);
      }
      
      console.log(`✅ Enviando ${validCertifications.length} certificação(ões) válida(s) para salvamento`);
      
      await onSubmit(data, uploadedFiles.aso || null, uploadedFiles.photo || null, validCertifications);
      form.reset();
      setUploadedFiles({ certifications: [] });
      setPhotoPreview("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar formulário",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordOption = form.watch('password_option');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Técnico" : "Novo Técnico"}</DialogTitle>
        </DialogHeader>

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
                onChange={(e) => handleFilesSelect(e.target.files)}
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

          {/* Mostrar documentos existentes (modo edição) */}
          {isEditing && existingDocuments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Documentos Existentes</p>
              {existingDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {doc.certificate_name || doc.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tipo: {doc.document_type === 'aso' ? 'ASO' : 'Certificação'}
                      {doc.expiry_date && ` • Validade: ${new Date(doc.expiry_date).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExistingDocument(doc.id, doc.document_type)}
                  >
                    Remover
                  </Button>
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
                  <Input {...field} type="email" placeholder="email@empresa.com" />
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
                  <Input {...field} placeholder="(00) 00000-0000" />
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
          <Button type="submit" disabled={isLoading || isExtracting}>
            {isLoading ? "Processando..." : isEditing ? "Atualizar" : "Criar Técnico e Usuário"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
