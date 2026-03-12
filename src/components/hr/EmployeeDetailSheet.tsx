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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeNotes } from "@/hooks/useEmployeeNotes";
import { Download, FileText, Plus, Trash2, User, Clock, MessageSquare, AlertTriangle, Award, Stethoscope, Settings2, Wrench, Pencil } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { NewTechnicianForm } from "@/components/admin/technicians/NewTechnicianForm";
import { sanitizeFileName } from "@/lib/utils";
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{employee.full_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{employee.full_name}</SheetTitle>
                {isTechnician && <Wrench className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {employee.roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">{ROLE_LABELS[r] || r}</Badge>
                ))}
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="personal" className="mt-2">
          <TabsList className={`w-full grid grid-cols-${tabCount}`} style={{ gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))` }}>
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
      </SheetContent>
    </Sheet>
  );
}

function PersonalTab({ employee }: { employee: EmployeeRow }) {
  const fields = [
    { label: "Nome completo", value: employee.full_name },
    { label: "Email", value: employee.email },
    { label: "Telefone", value: employee.phone || "—" },
    { label: "Departamento", value: employee.department?.name || "—" },
    { label: "Cargos", value: employee.roles.map((r) => ROLE_LABELS[r] || r).join(", ") },
    { label: "Na empresa desde", value: format(new Date(employee.created_at), "dd/MM/yyyy", { locale: ptBR }) },
  ];

  return (
    <div className="space-y-3 py-4">
      {fields.map((f) => (
        <div key={f.label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 border-b pb-2">
          <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{f.label}</span>
          <span className="text-sm text-foreground">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["employee-docs", employeeId],
    queryFn: async () => {
      const { data: corpDocs } = await supabase
        .from("corp_documents")
        .select("id, title, file_name, file_url, document_type, created_at")
        .eq("owner_user_id", employeeId);

      const { data: techProfile } = await supabase
        .from("technicians").select("id").eq("user_id", employeeId).maybeSingle();

      let techDocs: any[] = [];
      if (techProfile) {
        const { data } = await supabase
          .from("technician_documents")
          .select("id, document_type, file_path, uploaded_at, expiry_date, file_name, certificate_name")
          .eq("technician_id", techProfile.id);
        techDocs = (data || []).map((d: any) => ({
          id: d.id, title: d.certificate_name || d.document_type,
          file_name: d.file_name || d.file_path?.split("/").pop() || d.document_type,
          file_url: d.file_path, document_type: d.document_type,
          created_at: d.uploaded_at, source: "tech",
        }));
      }

      return [
        ...(corpDocs || []).map((d: any) => ({ ...d, source: "corp" })),
        ...techDocs,
      ];
    },
  });

  const handleDownload = async (doc: any) => {
    try {
      const bucket = doc.source === "tech" ? "technician-documents" : "corp-documents";
      const path = normalizeStoragePath(doc.file_url || doc.file_path);
      const { data, error } = await supabase.storage.from(bucket).download(path);
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

  if (isLoading) return <p className="py-6 text-center text-muted-foreground">Carregando...</p>;

  return (
    <div className="py-4 space-y-2">
      {docs.length === 0 ? (
        <p className="text-center text-muted-foreground py-6">Nenhum documento encontrado</p>
      ) : (
        docs.map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{doc.title || doc.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.document_type} • {format(new Date(doc.created_at), "dd/MM/yyyy")}
                  {doc.source === "tech" && <Badge variant="outline" className="ml-2 text-xs">Técnico</Badge>}
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
            description: `${absenceLabels[a.absence_type] || a.absence_type}: ${format(new Date(a.start_date), "dd/MM/yyyy")} a ${format(new Date(a.end_date), "dd/MM/yyyy")}`,
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
              <p className="text-xs text-muted-foreground">{format(new Date(ev.date), "dd/MM/yyyy", { locale: ptBR })}</p>
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
    { label: "CPF", value: tech.cpf || "—" },
    { label: "RG", value: tech.rg || "—" },
    { label: "Data de Nascimento", value: tech.birth_date ? format(new Date(tech.birth_date), "dd/MM/yyyy") : "—" },
    { label: "Gênero", value: tech.gender || "—" },
    { label: "Nacionalidade", value: tech.nationality || "—" },
    { label: "Altura (cm)", value: tech.height ? String(tech.height) : "—" },
    { label: "Tipo Sanguíneo", value: tech.blood_type ? `${tech.blood_type}${tech.blood_rh_factor || ""}` : "—" },
    { label: "ASO Válido até", value: tech.aso_valid_until ? format(new Date(tech.aso_valid_until), "dd/MM/yyyy") : "—" },
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
        <h3 className="text-sm font-semibold text-foreground">Dados do Técnico</h3>
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
                    {doc.expiry_date && ` • Validade: ${format(new Date(doc.expiry_date), "dd/MM/yyyy")}`}
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
              Tem certeza que deseja excluir {employee.full_name}? Esta ação não pode ser desfeita. O usuário e todos os documentos serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTechnician} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
