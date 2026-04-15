import { useState, useEffect } from "react";
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
import { useDocumentClassification, ClassificationResult } from "@/hooks/useDocumentClassification";
import { Eye, EyeOff, Sparkles, CheckCircle2, XCircle, Loader2, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ROLE_OPTIONS = [
  { value: "technician", label: "Técnico" },
  { value: "coordinator", label: "Coordenador" },
  { value: "hr", label: "RH" },
  { value: "commercial", label: "Comercial" },
  { value: "director", label: "Diretor" },
  { value: "compras", label: "Suprimentos" },
  { value: "qualidade", label: "Qualidade" },
  { value: "financeiro", label: "Financeiro" },
];

const employeeFormSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20).optional().or(z.literal("")),
  selected_role: z.string().min(1, "Cargo é obrigatório"),
  
  // Personal data
  cpf: z.string().trim().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)").optional().or(z.literal("")),
  rg: z.string().trim().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(['Masculino', 'Feminino']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  nationality: z.string().trim().optional().or(z.literal("")),
  height: z.string().optional().or(z.literal("")),
  
  // Technician-only fields
  specialty: z.string().trim().optional().or(z.literal("")),
  blood_type: z.enum(['A', 'B', 'AB', 'O']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  blood_rh_factor: z.enum(['Positivo', 'Negativo']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  aso_issue_date: z.string().optional().or(z.literal("")),
  aso_valid_until: z.string().optional().or(z.literal("")),
  medical_status: z.enum(['fit', 'unfit', 'pending']).optional().or(z.literal("")).transform(val => val === "" ? undefined : val),
  
  // Password
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

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface NewEmployeeFormProps {
  onSubmit: (data: EmployeeFormValues, uploadedFile: File | null, photoFile: File | null, certificationFiles: Array<{
    file: File;
    name?: string;
    issueDate?: string;
    expiryDate?: string;
  }>) => Promise<void>;
  onCancel: () => void;
}

export const NewEmployeeForm = ({ onSubmit, onCancel }: NewEmployeeFormProps) => {
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
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { classifyDocument, isClassifying } = useDocumentClassification();
  const { toast } = useToast();

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "", email: "", phone: "", selected_role: "",
      cpf: "", rg: "", birth_date: "", gender: undefined,
      nationality: "", height: "", specialty: "",
      blood_type: undefined, blood_rh_factor: undefined,
      aso_issue_date: "", aso_valid_until: "", medical_status: undefined,
      password_option: 'auto_email', password: "", isActive: true,
    },
  });

  const selectedRole = form.watch("selected_role");
  const isTechnician = selectedRole === "technician";
  const passwordOption = form.watch("password_option");

  useEffect(() => {
    if (passwordOption === 'manual') {
      const currentPhone = form.getValues("phone");
      if (currentPhone && currentPhone.includes('@')) {
        form.setValue("phone", "");
      }
      form.setValue("password", "");
    }
  }, [passwordOption, form]);

  const processCertificate = async (file: File) => {
    const fallbackName = file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, '').replace(/_/g, ' ');
    try {
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
        if (!context) return { certificate_name: fallbackName };
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        imageBase64 = canvas.toDataURL('image/png').split(',')[1];
      } else {
        const base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        imageBase64 = base64String.split(',')[1];
      }
      const { data, error } = await supabase.functions.invoke('extract-certificate-data', {
        body: { fileBase64: imageBase64, fileName: file.name }
      });
      if (error) return { certificate_name: fallbackName };
      const extractedData = data?.data || {};
      if (!extractedData.certificate_name) extractedData.certificate_name = fallbackName;
      return extractedData;
    } catch {
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
    let photoProcessedThisBatch = false;
    const certifications: typeof newFiles.certifications = [];

    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
        if (!photoProcessedThisBatch) {
          photoProcessedThisBatch = true;
          newFiles.photo = file;
          const reader = new FileReader();
          reader.onloadend = () => setPhotoPreview(reader.result as string);
          reader.readAsDataURL(file);
        } else {
          const classification = await classifyDocument(file);
          if (classification?.document_type === 'aso' && !asoPdf && !newFiles.aso) {
            asoPdf = file;
            asoData = classification.aso_data;
          } else {
            certifications.push({
              file, name: classification?.certificate_data?.certificate_name || file.name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, ''),
              issueDate: classification?.certificate_data?.issue_date,
              expiryDate: classification?.certificate_data?.expiry_date,
              isValid: classification?.certificate_data?.expiry_date ? new Date(classification.certificate_data.expiry_date) >= new Date() : undefined,
            });
          }
        }
      } else if (file.type === 'application/pdf') {
        const classification = await classifyDocument(file);
        if (classification?.document_type === 'aso' && !asoPdf && !newFiles.aso) {
          asoPdf = file;
          asoData = classification.aso_data;
          toast({ title: "ASO identificado", description: `"${file.name}" foi identificado como ASO.` });
        } else if (classification?.document_type === 'certification') {
          certifications.push({
            file, name: classification.certificate_data?.certificate_name || file.name.replace(/\.pdf$/i, ''),
            issueDate: classification.certificate_data?.issue_date,
            expiryDate: classification.certificate_data?.expiry_date,
            isValid: classification.certificate_data?.expiry_date ? new Date(classification.certificate_data.expiry_date) >= new Date() : undefined,
          });
        } else {
          if (!asoPdf && !newFiles.aso) {
            asoPdf = file;
            asoData = classification?.aso_data || null;
          } else {
            certifications.push({ file, name: file.name.replace(/\.pdf$/i, '') });
          }
        }
      }
    }

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
        if (asoData.aso_issue_date) form.setValue('aso_issue_date', asoData.aso_issue_date);
        if (asoData.aso_valid_until) form.setValue('aso_valid_until', asoData.aso_valid_until);
        if (asoData.medical_status) form.setValue('medical_status', asoData.medical_status);
        if (asoData.function) form.setValue('specialty', asoData.function);
        // Auto-select technician role when ASO is detected
        if (!form.getValues('selected_role')) form.setValue('selected_role', 'technician');
        toast({ title: "Dados extraídos com sucesso!", description: "O formulário foi preenchido automaticamente com os dados do ASO." });
      }
    }

    newFiles.certifications = [...newFiles.certifications, ...certifications];
    if (certifications.length > 0) {
      toast({ title: "Certificações adicionadas", description: `${certifications.length} certificação(ões) pronta(s) para envio.` });
    }
    setUploadedFiles(newFiles);
    setIsProcessing(false);
  };

  const removeFile = (type: 'aso' | 'photo' | 'certification', index?: number) => {
    const newFiles = { ...uploadedFiles };
    if (type === 'aso') delete newFiles.aso;
    else if (type === 'photo') { delete newFiles.photo; setPhotoPreview(""); }
    else if (type === 'certification' && index !== undefined) {
      newFiles.certifications = newFiles.certifications.filter((_, i) => i !== index);
    }
    setUploadedFiles(newFiles);
  };

  const handleSubmit = async (data: EmployeeFormValues) => {
    setIsLoading(true);
    try {
      const validCertifications = uploadedFiles.certifications.filter(cert => !!cert.file);
      await onSubmit(data, uploadedFiles.aso || null, uploadedFiles.photo || null, validCertifications);
      form.reset();
      setUploadedFiles({ certifications: [] });
      setPhotoPreview("");
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao processar formulário", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" autoComplete="off">
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
          <input type="text" name="fake_username" tabIndex={-1} autoComplete="username" />
          <input type="password" name="fake_password" tabIndex={-1} autoComplete="current-password" />
        </div>

        {/* Cargo / Role selector - FIRST */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">💼 Cargo</h3>
          <FormField
            control={form.control}
            name="selected_role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo do Colaborador *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Document upload - available for all roles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📁 Upload de Documentos</h3>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Input
              type="file"
              accept=".pdf,image/*"
              multiple
              onChange={(e) => { handleFilesSelect(e.target.files); e.target.value = ''; }}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground mt-2">
              {isTechnician
                ? "Arraste ou selecione: ASO (PDF), Foto (JPG/PNG), Certificações (PDF/Imagens)"
                : "Documentos pessoais (CPF, RG, comprovante de residência, certidão, etc.)"}
            </p>
            {isTechnician && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 Nomeie o ASO com "aso" no nome para identificação automática
              </p>
            )}
          </div>

          {/* Uploaded files display */}
          <div className="space-y-3">
            {uploadedFiles.aso && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">ASO: {uploadedFiles.aso.name}</p>
                    <p className="text-xs text-muted-foreground">Dados extraídos automaticamente</p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('aso')}>Remover</Button>
              </div>
            )}

            {uploadedFiles.photo && (
              <div>
                <p className="text-sm font-semibold mb-2">📷 Foto do Colaborador</p>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-4">
                    {photoPreview && <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-blue-400" />}
                    <div>
                      <p className="text-sm font-medium">{uploadedFiles.photo.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFiles.photo.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('photo')}>Remover</Button>
                </div>
              </div>
            )}

            {uploadedFiles.certifications.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{isTechnician ? "Certificações" : "Documentos"} ({uploadedFiles.certifications.length})</p>
                {uploadedFiles.certifications.map((cert, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 rounded border ${
                    cert.isValid === true ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                    : cert.isValid === false ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    : 'bg-muted'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {cert.isValid === true && <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />}
                        {cert.isValid === false && <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{cert.name || cert.file.name}</p>
                          {(cert.issueDate || cert.expiryDate) && (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {cert.issueDate && <p>Emissão: {new Date(cert.issueDate).toLocaleDateString('pt-BR')}</p>}
                              {cert.expiryDate && <p>Validade: {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFile('certification', index)}>Remover</Button>
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

        {/* Personal data */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">📝 Dados Pessoais</h3>
          
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo *</FormLabel>
              <FormControl><Input {...field} placeholder="Nome do colaborador" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl><Input {...field} placeholder="000.000.000-00" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="rg" render={({ field }) => (
              <FormItem>
                <FormLabel>RG</FormLabel>
                <FormControl><Input {...field} placeholder="RG/Identidade" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="birth_date" render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="nationality" render={({ field }) => (
              <FormItem>
                <FormLabel>Nacionalidade</FormLabel>
                <FormControl><Input {...field} placeholder="Brasil" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="height" render={({ field }) => (
              <FormItem>
                <FormLabel>Altura (cm)</FormLabel>
                <FormControl><Input {...field} type="number" placeholder="170" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Contact and Access */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">💼 Contato e Acesso</h3>
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="email@empresa.com" autoComplete="email" autoCapitalize="none" spellCheck={false} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} type="tel" inputMode="tel" placeholder="(00) 00000-0000" autoComplete="tel-national" spellCheck={false} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Emergency Contact */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🚨 Contato de Emergência</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="emergency_contact_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contato</FormLabel>
                <FormControl><Input {...field} placeholder="Nome completo" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="emergency_contact_phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone de Emergência</FormLabel>
                <FormControl><Input {...field} type="tel" inputMode="tel" placeholder="(00) 00000-0000" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">🔐 Credenciais de Acesso</h3>
          <FormField control={form.control} name="password_option" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto_email" id="auto_email" />
                    <Label htmlFor="auto_email" className="font-normal cursor-pointer">Gerar senha e enviar por email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="font-normal cursor-pointer">Definir senha temporária</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="reset_link" id="reset_link" />
                    <Label htmlFor="reset_link" className="font-normal cursor-pointer">Enviar link para colaborador definir senha</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {passwordOption === 'manual' && (
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Senha Temporária *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input {...field} type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          )}
        </div>

        {/* Technician-specific: Medical data & Specialty */}
        {isTechnician && (
          <>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">🩺 Dados Médicos</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="blood_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Sanguíneo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="AB">AB</SelectItem>
                        <SelectItem value="O">O</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="blood_rh_factor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fator RH</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Positivo">Positivo</SelectItem>
                        <SelectItem value="Negativo">Negativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="aso_valid_until" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade do ASO</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="medical_status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Médico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="fit">Apto</SelectItem>
                        <SelectItem value="unfit">Inapto</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">🔧 Dados Profissionais (Técnico)</h3>
              <FormField control={form.control} name="specialty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidade</FormLabel>
                  <FormControl><Input {...field} placeholder="Ex: Técnico de Eletrônica" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </>
        )}

        <FormField control={form.control} name="isActive" render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Status</FormLabel>
              <div className="text-sm text-muted-foreground">Colaborador ativo no sistema</div>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading || isClassifying}>
            {isLoading ? "Processando..." : "Criar Colaborador"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
