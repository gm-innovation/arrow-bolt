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
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const technicianFormSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(10, "Telefone inválido").max(20).optional().or(z.literal("")),
  
  // Novos campos do ASO
  cpf: z.string().trim().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido (formato: 000.000.000-00)").optional().or(z.literal("")),
  rg: z.string().trim().optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.enum(['Masculino', 'Feminino']).optional(),
  nationality: z.string().trim().optional().or(z.literal("")),
  height: z.string().optional().or(z.literal("")),
  blood_type: z.enum(['A', 'B', 'AB', 'O']).optional(),
  blood_rh_factor: z.enum(['Positivo', 'Negativo']).optional(),
  aso_valid_until: z.string().optional().or(z.literal("")),
  medical_status: z.enum(['fit', 'unfit', 'pending']).optional(),
  
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
  onSubmit: (data: TechnicianFormValues, uploadedFile: File | null) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<TechnicianFormValues>;
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
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
      aso_valid_until: initialData?.aso_valid_until || "",
      medical_status: initialData?.medical_status || undefined,
      role: initialData?.role || "",
      password_option: 'auto_email',
      password: "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    const extractedData = await extractFromPDF(file);
    
    if (extractedData) {
      // Auto-fill form with extracted data
      if (extractedData.full_name) form.setValue('name', extractedData.full_name);
      if (extractedData.cpf) form.setValue('cpf', extractedData.cpf);
      if (extractedData.rg) form.setValue('rg', extractedData.rg);
      if (extractedData.birth_date) form.setValue('birth_date', extractedData.birth_date);
      if (extractedData.gender) form.setValue('gender', extractedData.gender);
      if (extractedData.nationality) form.setValue('nationality', extractedData.nationality);
      if (extractedData.height) form.setValue('height', extractedData.height.toString());
      if (extractedData.blood_type) form.setValue('blood_type', extractedData.blood_type);
      if (extractedData.blood_rh_factor) form.setValue('blood_rh_factor', extractedData.blood_rh_factor);
      if (extractedData.aso_valid_until) form.setValue('aso_valid_until', extractedData.aso_valid_until);
      if (extractedData.medical_status) form.setValue('medical_status', extractedData.medical_status);
      if (extractedData.function) form.setValue('role', extractedData.function);
    }
  };

  const handleSubmit = async (data: TechnicianFormValues) => {
    setIsLoading(true);
    try {
      await onSubmit(data, uploadedFile);
      form.reset();
      setUploadedFile(null);
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

        {!isEditing && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">📄 Upload do ASO</h3>
              <DocumentUploadZone
                onFileSelect={handleFileSelect}
                isProcessing={isExtracting}
              />
            </div>
            {uploadedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Campos preenchidos automaticamente do ASO</span>
              </div>
            )}
          </div>
        )}

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
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Técnico de Manutenção">Técnico de Manutenção</SelectItem>
                    <SelectItem value="Técnico de Refrigeração">Técnico de Refrigeração</SelectItem>
                    <SelectItem value="Técnico de Eletrônica">Técnico de Eletrônica</SelectItem>
                    <SelectItem value="Técnico de Mecânica">Técnico de Mecânica</SelectItem>
                    <SelectItem value="Auxiliar Técnico">Auxiliar Técnico</SelectItem>
                  </SelectContent>
                </Select>
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
