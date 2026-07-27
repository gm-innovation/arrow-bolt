import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeNotes } from "@/hooks/useEmployeeNotes";
import { useShareableCatalog, useEmployeeBlocks, useSetBlock, useBulkSetEmployee } from "@/hooks/useHRDocumentSharing";
import { useEmployeeDocuments, useUploadEmployeeDocument } from "@/hooks/useHRDocumentCompliance";
import { Switch } from "@/components/ui/switch";
import { Download, FileText, Plus, Trash2, User, Clock, MessageSquare, AlertTriangle, Award, Stethoscope, Settings2, Wrench, Pencil, MoreVertical, Archive, UserX, UserCheck, Share2, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { NewTechnicianForm } from "@/components/admin/technicians/NewTechnicianForm";
import { sanitizeFileName, formatLocalDate } from "@/lib/utils";
import type { EmployeeRow } from "@/pages/hr/Employees";

const ROLE_LABELS: Record<string, string> = {
  technician: "Técnico",
  coordinator: "Coordenador",
  hr: "RH",
  commercial: "Comercial",
  director: "Diretor",
  compras: "Suprimentos",
  qualidade: "Qualidade",
  financeiro: "Financeiro",
  super_admin: "Administrador",
};

const NOTE_TYPES = [
  { value: "general", label: "Geral", icon: MessageSquare },
  { value: "warning", label: "Advertência", icon: AlertTriangle },
  { value: "praise", label: "Elogio", icon: Award },
  { value: "medical", label: "Médico", icon: Stethoscope },
  { value: "administrative", label: "Administrativo", icon: Settings2 },
];

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  archived: { label: "Arquivado", variant: "outline" },
};

const GENDER_OPTIONS = [
  { value: "Masculino", label: "Masculino" },
  { value: "Feminino", label: "Feminino" },
  { value: "Outro", label: "Outro" },
];

interface EmployeeDetailSheetProps {
  employee: EmployeeRow;
  open: boolean;
  onClose: () => void;
}

const normalizeStoragePath = (fileUrl: string) => {
  if (!fileUrl.includes("http")) return fileUrl;
  const parts = fileUrl.split("/corp-documents/");
  return parts.length > 1 ? parts[1] : fileUrl;
};

export function EmployeeDetailSheet({ employee, open, onClose }: EmployeeDetailSheetProps) {
  const isTechnician = !!employee.technician;
  const tabCount = isTechnician ? 5 : 4;
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const status = (employee as any).status || "active";
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.active;

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", employee.id);
      if (error) throw error;

      // Sync technician active status
      if (isTechnician) {
        await supabase.from("technicians").update({ active: newStatus === "active" }).eq("user_id", employee.id);
      }

      toast({ title: newStatus === "active" ? "Colaborador ativado" : newStatus === "inactive" ? "Colaborador inativado" : "Colaborador arquivado" });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
    } catch {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: employee.id } });
      if (error) throw error;
      toast({ title: "Colaborador excluído", description: `${employee.full_name} foi removido.` });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{employee.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{employee.full_name}</SheetTitle>
                {isTechnician && <Wrench className="h-4 w-4 text-muted-foreground" />}
                <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {employee.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">{ROLE_LABELS[r] || r}</Badge>
                ))}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {status === "active" ? (
                  <DropdownMenuItem onClick={() => handleStatusChange("inactive")}>
                    <UserX className="h-4 w-4 mr-2" /> Inativar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleStatusChange("active")}>
                    <UserCheck className="h-4 w-4 mr-2" /> Ativar
                  </DropdownMenuItem>
                )}
                {status !== "archived" && (
                  <DropdownMenuItem onClick={() => setArchiveConfirmOpen(true)}>
                    <Archive className="h-4 w-4 mr-2" /> Arquivar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <Tabs defaultValue="personal" storageKey={`employee-detail:${employee.id}`} className="mt-2">
          <TabsList className={`w-full grid`} style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}>
            <TabsTrigger value="personal"><User className="h-4 w-4 mr-1 hidden sm:inline" />Dados</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1 hidden sm:inline" />Docs</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-4 w-4 mr-1 hidden sm:inline" />Histórico</TabsTrigger>
            <TabsTrigger value="notes"><MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />Anotações</TabsTrigger>
            {isTechnician && (
              <TabsTrigger value="technician"><Wrench className="h-4 w-4 mr-1 hidden sm:inline" />Técnico</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personal">
            <PersonalTab employee={employee} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab employeeId={employee.id} companyId={employee.company_id} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryTab employeeId={employee.id} />
          </TabsContent>
          <TabsContent value="notes">
            <NotesTab employeeId={employee.id} companyId={employee.company_id} />
          </TabsContent>
          {isTechnician && (
            <TabsContent value="technician">
              <TechnicianTab employee={employee} />
            </TabsContent>
          )}
        </Tabs>

        {/* Archive Confirmation */}
        <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar colaborador?</AlertDialogTitle>
              <AlertDialogDescription>
                {employee.full_name} será arquivado e não aparecerá na lista padrão. Você pode reativá-lo depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { handleStatusChange("archived"); setArchiveConfirmOpen(false); }}>Arquivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
              <AlertDialogDescription>
                {employee.full_name} será excluído permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

function PersonalTab({ employee }: { employee: EmployeeRow }) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(employee.full_name || "");
  const [phone, setPhone] = useState(employee.phone || "");
  const [cpf, setCpf] = useState(employee.cpf || employee.technician?.cpf || "");
  const [rg, setRg] = useState(employee.rg || employee.technician?.rg || "");
  const [birthDate, setBirthDate] = useState(employee.birth_date || employee.technician?.birth_date || "");
  const [gender, setGender] = useState(employee.gender || employee.technician?.gender || "");
  const [nationality, setNationality] = useState(employee.nationality || employee.technician?.nationality || "");
  const [height, setHeight] = useState(employee.height ? String(employee.height) : employee.technician?.height ? String(employee.technician.height) : "");
  const [emergencyName, setEmergencyName] = useState((employee as any).emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState((employee as any).emergency_contact_phone || "");
  const [hireDate, setHireDate] = useState((employee as any).hire_date || "");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const profileUpdate: any = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        cpf: cpf.trim() || null,
        rg: rg.trim() || null,
        birth_date: birthDate || null,
        gender: gender || null,
        nationality: nationality.trim() || null,
        height: height ? parseInt(height) : null,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
        hire_date: hireDate || null,
      };

      const { error } = await supabase.from("profiles").update(profileUpdate).eq("id", employee.id);
      if (error) throw error;

      // Sync with technicians table if applicable
      if (employee.technician) {
        await supabase.from("technicians").update({
          cpf: cpf.trim() || null,
          rg: rg.trim() || null,
          birth_date: birthDate || null,
          gender: gender || null,
          nationality: nationality.trim() || null,
          height: height ? parseInt(height) : null,
        }).eq("user_id", employee.id);
      }

      toast({ title: "Dados atualizados com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar dados", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFullName(employee.full_name || "");
    setPhone(employee.phone || "");
    setCpf(employee.cpf || employee.technician?.cpf || "");
    setRg(employee.rg || employee.technician?.rg || "");
    setBirthDate(employee.birth_date || employee.technician?.birth_date || "");
    setGender(employee.gender || employee.technician?.gender || "");
    setNationality(employee.nationality || employee.technician?.nationality || "");
    setHeight(employee.height ? String(employee.height) : employee.technician?.height ? String(employee.technician.height) : "");
    setEmergencyName((employee as any).emergency_contact_name || "");
    setEmergencyPhone((employee as any).emergency_contact_phone || "");
    setHireDate((employee as any).hire_date || "");
  };

  const readOnlyFields = [
    { label: "Email", value: employee.email },
    { label: "Cargos", value: employee.roles.map((r) => ROLE_LABELS[r] || r).join(", ") },
  ];

  const editableField = (label: string, value: string, onChange: (v: string) => void, displayValue?: string, type?: string) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
      <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
      {isEditing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8" type={type || "text"} />
      ) : (
        <span className="text-sm text-foreground">{displayValue || value || "—"}</span>
      )}
    </div>
  );

  return (
    <div className="space-y-3 py-4">
      <div className="flex justify-end">
        {!isEditing ? (
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>Salvar</Button>
          </div>
        )}
      </div>

      {editableField("Nome completo", fullName, setFullName)}
      {editableField("Telefone", phone, setPhone)}
      {editableField("CPF", cpf, setCpf)}
      {editableField("RG", rg, setRg)}
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
        <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">Data de Nascimento</span>
        {isEditing ? (
          <Input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="h-8" type="date" />
        ) : (
          <span className="text-sm text-foreground">{birthDate ? formatLocalDate(birthDate) : "—"}</span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
        <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">Gênero</span>
        {isEditing ? (
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-foreground">{gender || "—"}</span>
        )}
      </div>

      {editableField("Nacionalidade", nationality, setNationality)}
      {editableField("Altura (cm)", height, setHeight, height ? `${height} cm` : "—")}

      {/* Emergency Contact */}
      <div className="pt-2">
        <p className="text-sm font-semibold text-muted-foreground mb-2">🚨 Contato de Emergência</p>
      </div>
      {editableField("Nome do contato", emergencyName, setEmergencyName)}
      {editableField("Telefone emergência", emergencyPhone, setEmergencyPhone)}

      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
        <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">Na empresa desde</span>
        {isEditing ? (
          <Input value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="h-8" type="date" />
        ) : (
          <span className="text-sm text-foreground">
            {hireDate ? formatLocalDate(hireDate) : format(new Date(employee.created_at), "dd/MM/yyyy", { locale: ptBR })}
            {!hireDate && <span className="ml-2 text-xs text-muted-foreground">(data de cadastro — edite para definir admissão)</span>}
          </span>
        )}
      </div>

      {readOnlyFields.map((f) => (
        <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
          <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{f.label}</span>
          <span className="text-sm text-foreground">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const [showUpload, setShowUpload] = useState(false);
  const [catalogId, setCatalogId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const queryClient = useQueryClient();

  const { data: catalog = [] } = useShareableCatalog();
  const { data: docs = [], isLoading } = useEmployeeDocuments(employeeId);
  const { data: blocks = [] } = useEmployeeBlocks(employeeId);
  const upload = useUploadEmployeeDocument();
  const setBlock = useSetBlock();
  const bulk = useBulkSetEmployee();

  const catalogById = new Map<string, any>((catalog as any[]).map((c: any) => [c.id, c]));
  const blockedCatalogIds = new Set(blocks.map((g: any) => g.catalog_id));
  const shareableCount = (catalog as any[]).filter((c: any) => c.coordinator_shareable).length;
  const sharedCount = Math.max(0, shareableCount - blockedCatalogIds.size);

  // Group current docs by catalog + list historical
  const currentDocs = (docs as any[]).filter((d) => d.is_current);
  const historicalDocs = (docs as any[]).filter((d) => !d.is_current);

  const handleUpload = async () => {
    if (!uploadFile || !catalogId) {
      toast({ title: "Selecione o tipo e o arquivo", variant: "destructive" });
      return;
    }
    try {
      const cat = catalogById.get(catalogId);
      await upload.mutateAsync({
        employee_id: employeeId,
        catalog_id: catalogId,
        catalog_code: cat?.code ?? null,
        file: uploadFile,
        issue_date: issueDate || null,
      });
      // Optional: patch expiry_date if manually set
      if (expiryDate) {
        const { data: latest } = await (supabase as any)
          .from("hr_employee_documents")
          .select("id")
          .eq("employee_id", employeeId)
          .eq("catalog_id", catalogId)
          .eq("is_current", true)
          .maybeSingle();
        if (latest?.id) {
          await (supabase as any)
            .from("hr_employee_documents")
            .update({ expiry_date: expiryDate })
            .eq("id", latest.id);
        }
      }
      setCatalogId(""); setIssueDate(""); setExpiryDate(""); setUploadFile(null); setShowUpload(false);
      queryClient.invalidateQueries({ queryKey: ["hr-employee-documents", employeeId] });
    } catch (err: any) {
      toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("corp-documents")
        .createSignedUrl(doc.file_path, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast({ title: "Erro ao abrir documento", variant: "destructive" });
    }
  };

  const handleDelete = async (doc: any) => {
    try {
      await supabase.storage.from("corp-documents").remove([doc.file_path]);
      const { error } = await (supabase as any).from("hr_employee_documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Documento excluído" });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-documents", employeeId] });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const reviewBadge = (status: string) => {
    if (status === "approved") return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Aprovado</Badge>;
    if (status === "rejected") return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock3 className="h-3 w-3" />Em revisão</Badge>;
  };

  const expiryBadge = (doc: any) => {
    if (!doc.expiry_date) return null;
    const diff = Math.round((new Date(doc.expiry_date).getTime() - Date.now()) / 86400000);
    if (diff < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (diff < 30) return <Badge variant="outline">A vencer em {diff}d</Badge>;
    return <Badge variant="outline">Válido até {formatLocalDate(doc.expiry_date)}</Badge>;
  };

  if (isLoading) return <p className="py-6 text-center text-muted-foreground">Carregando...</p>;

  const renderDoc = (doc: any, isHistorical = false) => {
    const cat = catalogById.get(doc.catalog_id);
    const shareable = cat?.coordinator_shareable;
    const blocked = blockedCatalogIds.has(doc.catalog_id);
    return (
      <div key={doc.id} className="p-3 border rounded-lg space-y-2 hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{cat?.name ?? "Documento"}</p>
              <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {reviewBadge(doc.review_status)}
                {expiryBadge(doc)}
                {isHistorical && <Badge variant="outline" className="text-xs">Histórico</Badge>}
                {!isHistorical && shareable && !blocked && (
                  <Badge variant="secondary" className="gap-1 text-xs"><Share2 className="h-3 w-3" />Compartilhado</Badge>
                )}
                {!isHistorical && shareable && blocked && (
                  <Badge variant="outline" className="gap-1 text-xs text-destructive border-destructive/40"><XCircle className="h-3 w-3" />Bloqueado</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" onClick={() => handleDownload(doc)} title="Baixar">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(doc)} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!isHistorical && shareable && (
          <div className="flex items-center gap-2 text-xs pt-1 border-t">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">
              {blocked ? "Bloqueado para coordenadores (exceção)" : "Liberado automaticamente para coordenadores"}
            </span>
            <Switch
              checked={!blocked}
              onCheckedChange={(v) => setBlock.mutate({ employee_id: employeeId, catalog_id: doc.catalog_id, block: !v })}
              disabled={setBlock.isPending}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-4 space-y-3">
      <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Share2 className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground flex-1">
            Documentos de tipos compartilháveis (ASO, NRs, RG, CPF, CNH…) são <b>liberados automaticamente</b> para coordenadores.
            Use os botões abaixo para agir em massa ou o interruptor de cada documento para exceções.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">{sharedCount}/{shareableCount} tipos liberados</Badge>
          {blockedCatalogIds.size > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/40">{blockedCatalogIds.size} bloqueio(s)</Badge>
          )}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={bulk.isPending || blockedCatalogIds.size === 0}
              onClick={() => bulk.mutate({ employee_id: employeeId, action: "release_all" })}>
              Liberar tudo
            </Button>
            <Button size="sm" variant="outline" disabled={bulk.isPending}
              onClick={() => bulk.mutate({ employee_id: employeeId, action: "block_all" })}>
              Bloquear tudo
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {currentDocs.length} documento(s) vigente(s)
        </p>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
          <Plus className="h-4 w-4 mr-1" /> Enviar Documento
        </Button>
      </div>


      {showUpload && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div>
            <label className="text-xs font-medium">Tipo do documento *</label>
            <Select value={catalogId} onValueChange={setCatalogId}>
              <SelectTrigger><SelectValue placeholder="Selecionar tipo do catálogo..." /></SelectTrigger>
              <SelectContent>
                {(catalog as any[]).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Data de emissão</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Data de validade</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="relative">
            <Button variant="outline" className="w-full justify-start text-muted-foreground">
              {uploadFile ? uploadFile.name : "Selecionar arquivo..."}
            </Button>
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleUpload} disabled={upload.isPending || !uploadFile || !catalogId}>
              {upload.isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      )}

      {currentDocs.length === 0 && historicalDocs.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Nenhum documento encontrado</p>
      ) : (
        <>
          {currentDocs.map((d) => renderDoc(d, false))}
          {historicalDocs.length > 0 && (
            <>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowLegacy(!showLegacy)}>
                {showLegacy ? "Ocultar" : "Mostrar"} histórico ({historicalDocs.length})
              </Button>
              {showLegacy && historicalDocs.map((d) => renderDoc(d, true))}
            </>
          )}
        </>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O documento "{deleteTarget?.file_name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function HistoryTab({ employeeId }: { employeeId: string }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["employee-history", employeeId],
    queryFn: async () => {
      const timeline: { date: string; type: string; description: string }[] = [];

      const { data: tech } = await supabase
        .from("technicians").select("id").eq("user_id", employeeId).maybeSingle();

      if (tech) {
        const { data: absences } = await supabase
          .from("technician_absences").select("*").eq("technician_id", tech.id)
          .order("start_date", { ascending: false }).limit(50);

        const absenceLabels: Record<string, string> = {
          vacation: "Férias", day_off: "Folga", medical_exam: "Exame Médico",
          training: "Treinamento", sick_leave: "Atestado",
        };

        (absences || []).forEach((a: any) => {
          timeline.push({
            date: a.start_date, type: "absence",
            description: `${absenceLabels[a.absence_type] || a.absence_type}: ${formatLocalDate(a.start_date)} a ${formatLocalDate(a.end_date)}`,
          });
        });
      }

      const { data: onboarding } = await supabase
        .from("employee_onboarding").select("*").eq("user_id", employeeId)
        .order("created_at", { ascending: false }).limit(20);

      (onboarding || []).forEach((o: any) => {
        timeline.push({
          date: o.created_at, type: "onboarding",
          description: `Onboarding: ${o.status === "completed" ? "Concluído" : o.status === "in_progress" ? "Em andamento" : "Pendente"}`,
        });
      });

      return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
  });

  if (isLoading) return <p className="py-6 text-center text-muted-foreground">Carregando...</p>;

  return (
    <div className="py-4 space-y-3">
      {events.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Nenhum registro no histórico</p>
      ) : (
        events.map((ev, i) => (
          <div key={i} className="flex gap-3 border-l-2 border-muted-foreground/20 pl-4 py-1">
            <div>
              <p className="text-sm text-foreground">{ev.description}</p>
              <p className="text-xs text-muted-foreground">{formatLocalDate(ev.date)}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function NotesTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const { notes, isLoading, createNote, deleteNote } = useEmployeeNotes(employeeId);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [isConfidential, setIsConfidential] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    createNote.mutate(
      { employee_user_id: employeeId, company_id: companyId, note_type: noteType, title: title.trim(), content: content.trim(), is_confidential: isConfidential },
      {
        onSuccess: () => {
          setTitle(""); setContent(""); setNoteType("general"); setIsConfidential(false); setShowForm(false);
        },
      }
    );
  };

  const noteTypeConfig = NOTE_TYPES.reduce((acc, t) => ({ ...acc, [t.value]: t }), {} as Record<string, typeof NOTE_TYPES[0]>);

  return (
    <div className="py-4 space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" /> Nova anotação
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <Input placeholder="Título da anotação" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-3">
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="confidential" checked={isConfidential} onCheckedChange={(v) => setIsConfidential(!!v)} />
              <label htmlFor="confidential" className="text-sm text-muted-foreground">Confidencial</label>
            </div>
          </div>
          <Textarea placeholder="Conteúdo da anotação..." value={content} onChange={(e) => setContent(e.target.value)} rows={3} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={createNote.isPending}>Salvar</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-6">Carregando...</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Nenhuma anotação registrada</p>
      ) : (
        notes.map((note) => {
          const config = noteTypeConfig[note.note_type] || noteTypeConfig.general;
          const Icon = config.icon;
          return (
            <div key={note.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{note.title}</span>
                  <Badge variant="outline" className="text-xs">{config.label}</Badge>
                  {note.is_confidential && <Badge variant="destructive" className="text-xs">Confidencial</Badge>}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteNote.mutate(note.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground">
                Por {note.author?.full_name || "—"} em {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function TechnicianTab({ employee }: { employee: EmployeeRow }) {
  const tech = employee.technician!;
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: techDocs = [] } = useQuery({
    queryKey: ["tech-docs-tab", tech.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("technician_documents")
        .select("id, document_type, file_name, file_path, certificate_name, issue_date, expiry_date, uploaded_at")
        .eq("technician_id", tech.id)
        .order("uploaded_at", { ascending: false });
      return data || [];
    },
  });

  const getAsoStatus = (asoDate?: string | null) => {
    if (!asoDate) return { label: "Não informado", variant: "secondary" as const };
    const date = new Date(asoDate);
    const today = new Date();
    if (date < today) return { label: "Vencido", variant: "destructive" as const };
    if (date <= addDays(today, 30)) return { label: "A vencer", variant: "secondary" as const };
    return { label: "Válido", variant: "default" as const };
  };

  const aso = getAsoStatus(tech.aso_valid_until);

  const medicalFields = [
    { label: "Especialidade", value: tech.specialty || "—" },
    { label: "Tipo Sanguíneo", value: tech.blood_type ? `${tech.blood_type}${tech.blood_rh_factor || ""}` : "—" },
    { label: "ASO Válido até", value: tech.aso_valid_until ? formatLocalDate(tech.aso_valid_until) : "—" },
    { label: "Status Médico", value: tech.medical_status || "—" },
  ];

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from("technician-documents").download(doc.file_path);
      if (error) throw error;
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = doc.file_name || "document";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Erro ao baixar documento", variant: "destructive" });
    }
  };

  const handleDeleteTechnician = async () => {
    try {
      const { error: userError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: employee.id }
      });
      if (userError) console.error('Erro ao excluir usuário:', userError);

      const { data: documents } = await supabase
        .from('technician_documents').select('file_path').eq('technician_id', tech.id);
      if (documents && documents.length > 0) {
        await supabase.storage.from('technician-documents').remove(documents.map(d => d.file_path));
      }

      await supabase.from('technicians').delete().eq('id', tech.id);

      toast({ title: "Técnico excluído", description: `${employee.full_name} foi removido.` });
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      setIsDeleteOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateTechnician = async (
    data: any, uploadedFile: File | null, photoFile: File | null,
    certificationFiles: Array<{ file: File; name?: string; issueDate?: string; expiryDate?: string }>
  ) => {
    try {
      if (photoFile) {
        try {
          if (employee.avatar_url) {
            try {
              const oldUrl = new URL(employee.avatar_url);
              const pathMatch = oldUrl.pathname.match(/\/technician-avatars\/(.+?)(?:\?|$)/);
              if (pathMatch) await supabase.storage.from('technician-avatars').remove([decodeURIComponent(pathMatch[1])]);
            } catch (e) { console.warn('Could not remove old avatar:', e); }
          }
          const photoExt = photoFile.name.split('.').pop();
          const timestamp = Date.now();
          const photoPath = `${employee.id}/avatar-${timestamp}.${photoExt}`;
          const { error: uploadError } = await supabase.storage.from('technician-avatars').upload(photoPath, photoFile, { upsert: true, contentType: photoFile.type, cacheControl: '0' });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('technician-avatars').getPublicUrl(photoPath);
            await supabase.from('profiles').update({ avatar_url: `${publicUrl}?v=${timestamp}` }).eq('id', employee.id);
          }
        } catch (e) { console.error('Photo upload error:', e); }
      }

      await supabase.from('profiles').update({ full_name: data.name, phone: data.phone || null }).eq('id', employee.id);

      await supabase.from('technicians').update({
        specialty: data.role, cpf: data.cpf || null, rg: data.rg || null,
        birth_date: data.birth_date || null, gender: data.gender || null,
        nationality: data.nationality || null, height: data.height ? parseInt(data.height) : null,
        blood_type: data.blood_type || null, blood_rh_factor: data.blood_rh_factor || null,
        aso_valid_until: data.aso_valid_until || null, medical_status: data.medical_status || 'pending',
      }).eq('id', tech.id);

      if (uploadedFile) {
        const filePath = `${employee.company_id}/${tech.id}/aso/${Date.now()}-${uploadedFile.name}`;
        const { error: uploadError } = await supabase.storage.from('technician-documents').upload(filePath, uploadedFile);
        if (!uploadError) {
          await supabase.from('technician_documents').insert({
            technician_id: tech.id, document_type: 'aso', file_name: uploadedFile.name,
            file_path: filePath, issue_date: data.aso_issue_date || null, expiry_date: data.aso_valid_until || null,
            metadata: data.aso_issue_date ? { aso_issue_date: data.aso_issue_date } : null,
          });
        }
      }

      if (certificationFiles.length > 0) {
        for (let i = 0; i < certificationFiles.length; i++) {
          const cert = certificationFiles[i];
          const sanitizedName = sanitizeFileName(cert.file.name);
          const certPath = `${employee.company_id}/${tech.id}/certifications/${Date.now()}-${i}-${sanitizedName}`;
          const { error: certError } = await supabase.storage.from('technician-documents').upload(certPath, cert.file);
          if (!certError) {
            await supabase.from('technician_documents').insert({
              technician_id: tech.id, document_type: 'certification', file_name: cert.file.name,
              file_path: certPath, certificate_name: cert.name || cert.file.name,
              issue_date: cert.issueDate, expiry_date: cert.expiryDate,
            });
          }
        }
      }

      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hr-employees"] });
      queryClient.invalidateQueries({ queryKey: ["tech-docs-tab", tech.id] });
      toast({ title: "Técnico atualizado", description: `${data.name} foi atualizado com sucesso.` });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="py-4 space-y-6">
      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setIsEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setIsDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" /> Excluir
        </Button>
      </div>

      {/* ASO Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Status ASO:</span>
        <Badge variant={aso.variant}>{aso.label}</Badge>
      </div>

      {/* Medical/Personal Data */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Dados Técnicos</h3>
        {medicalFields.map((f) => (
          <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
            <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{f.label}</span>
            <span className="text-sm text-foreground">{f.value}</span>
          </div>
        ))}
      </div>

      {/* Technical Documents */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Documentos Técnicos</h3>
        {techDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento técnico</p>
        ) : (
          techDocs.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.certificate_name || doc.file_name || doc.document_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.document_type === "aso" ? "ASO" : "Certificação"}
                    {doc.expiry_date && ` • Validade: ${formatLocalDate(doc.expiry_date)}`}
                  </p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDownload(doc)}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Técnico</DialogTitle>
          </DialogHeader>
          <NewTechnicianForm
            onSubmit={handleUpdateTechnician}
            onCancel={() => setIsEditOpen(false)}
            isEditing
            initialData={{
              name: employee.full_name,
              email: employee.email,
              phone: employee.phone || "",
              role: tech.specialty || "",
              cpf: tech.cpf || "",
              rg: tech.rg || "",
              birth_date: tech.birth_date || "",
              gender: (tech.gender as "Masculino" | "Feminino" | undefined) || undefined,
              nationality: tech.nationality || "",
              height: tech.height ? String(tech.height) : "",
              blood_type: (tech.blood_type as "A" | "B" | "AB" | "O" | undefined) || undefined,
              blood_rh_factor: (tech.blood_rh_factor as "Positivo" | "Negativo" | undefined) || undefined,
              aso_valid_until: tech.aso_valid_until || "",
              medical_status: (tech.medical_status as "fit" | "pending" | "unfit" | undefined) || undefined,
              avatar_url: employee.avatar_url || undefined,
              user_id: employee.id,
              documents: techDocs.map((d: any) => ({
                id: d.id, file_name: d.file_name || "", certificate_name: d.certificate_name,
                issue_date: d.issue_date, expiry_date: d.expiry_date,
                document_type: d.document_type, file_path: d.file_path,
              })),
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Técnico</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O técnico {employee.full_name} será removido permanentemente do sistema, incluindo todos os seus dados e documentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteTechnician}>
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
