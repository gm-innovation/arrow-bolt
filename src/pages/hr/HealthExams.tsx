import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Download,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  HealthExam,
  HealthExamResult,
  HealthExamType,
  downloadHealthExamAttachment,
  examResultLabel,
  examResultVariant,
  examTypeLabel,
  getExamStatus,
  useDeleteHealthExam,
  useHealthExamSettings,
  useHealthExams,
  useUpsertHealthExam,
} from "@/hooks/useHealthExams";

interface EmployeeOption {
  id: string;
  full_name: string | null;
  position: string | null;
  avatar_url: string | null;
}

function useEmployeeOptions() {
  return useQuery({
    queryKey: ["employee-options-for-hr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, position, avatar_url, is_active")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return ((data ?? []) as EmployeeOption[]);
    },
  });
}

const emptyForm = {
  id: undefined as string | undefined,
  employee_id: "",
  exam_type: "periodico" as HealthExamType,
  exam_date: format(new Date(), "yyyy-MM-dd"),
  next_exam_date: "",
  clinic_name: "",
  doctor_name: "",
  doctor_crm: "",
  result: "apto" as HealthExamResult,
  restrictions: "",
  observations: "",
  file: null as File | null,
};

function ExamDialog({
  trigger,
  initial,
  onDone,
}: {
  trigger: React.ReactNode;
  initial?: Partial<HealthExam>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    ...emptyForm,
    ...(initial
      ? {
          id: initial.id,
          employee_id: initial.employee_id ?? "",
          exam_type: (initial.exam_type as HealthExamType) ?? "periodico",
          exam_date: initial.exam_date ?? emptyForm.exam_date,
          next_exam_date: initial.next_exam_date ?? "",
          clinic_name: initial.clinic_name ?? "",
          doctor_name: initial.doctor_name ?? "",
          doctor_crm: initial.doctor_crm ?? "",
          result: (initial.result as HealthExamResult) ?? "apto",
          restrictions: initial.restrictions ?? "",
          observations: initial.observations ?? "",
        }
      : {}),
  });
  const employees = useEmployeeOptions();
  const upsert = useUpsertHealthExam();

  const submit = async () => {
    if (!form.employee_id) return;
    await upsert.mutateAsync({
      id: form.id,
      employee_id: form.employee_id,
      exam_type: form.exam_type,
      exam_date: form.exam_date,
      next_exam_date: form.next_exam_date || null,
      clinic_name: form.clinic_name || null,
      doctor_name: form.doctor_name || null,
      doctor_crm: form.doctor_crm || null,
      result: form.result,
      restrictions: form.restrictions || null,
      observations: form.observations || null,
      file: form.file,
    });
    setOpen(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar Exame" : "Registrar Exame Ocupacional"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2">
            <Label>Colaborador *</Label>
            <Select
              value={form.employee_id}
              onValueChange={(v) => setForm((s) => ({ ...s, employee_id: v }))}
              disabled={!!form.id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {(employees.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}
                    {e.position ? ` — ${e.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo *</Label>
            <Select
              value={form.exam_type}
              onValueChange={(v) => setForm((s) => ({ ...s, exam_type: v as HealthExamType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(examTypeLabel) as HealthExamType[]).map((t) => (
                  <SelectItem key={t} value={t}>{examTypeLabel[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resultado *</Label>
            <Select
              value={form.result}
              onValueChange={(v) => setForm((s) => ({ ...s, result: v as HealthExamResult }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(examResultLabel) as HealthExamResult[]).map((r) => (
                  <SelectItem key={r} value={r}>{examResultLabel[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data do Exame *</Label>
            <Input
              type="date"
              value={form.exam_date}
              onChange={(e) => setForm((s) => ({ ...s, exam_date: e.target.value }))}
            />
          </div>

          <div>
            <Label>Próximo Exame (opcional — calculado automaticamente)</Label>
            <Input
              type="date"
              value={form.next_exam_date}
              onChange={(e) => setForm((s) => ({ ...s, next_exam_date: e.target.value }))}
            />
          </div>

          <div>
            <Label>Clínica</Label>
            <Input
              value={form.clinic_name}
              onChange={(e) => setForm((s) => ({ ...s, clinic_name: e.target.value }))}
            />
          </div>

          <div>
            <Label>Médico</Label>
            <Input
              value={form.doctor_name}
              onChange={(e) => setForm((s) => ({ ...s, doctor_name: e.target.value }))}
            />
          </div>

          <div>
            <Label>CRM</Label>
            <Input
              value={form.doctor_crm}
              onChange={(e) => setForm((s) => ({ ...s, doctor_crm: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Restrições</Label>
            <Textarea
              rows={2}
              value={form.restrictions}
              onChange={(e) => setForm((s) => ({ ...s, restrictions: e.target.value }))}
              placeholder="Ex.: apto com uso obrigatório de óculos"
            />
          </div>

          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              rows={2}
              value={form.observations}
              onChange={(e) => setForm((s) => ({ ...s, observations: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Anexo (ASO em PDF)</Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setForm((s) => ({ ...s, file: e.target.files?.[0] ?? null }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending || !form.employee_id}>
            {upsert.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ nextDate, alertDays }: { nextDate: string | null; alertDays: number }) {
  const status = getExamStatus(nextDate, alertDays);
  if (status === "expired") return <Badge variant="destructive">Vencido</Badge>;
  if (status === "expiring") return <Badge variant="secondary">A vencer</Badge>;
  if (status === "valid") return <Badge>Válido</Badge>;
  return <Badge variant="outline">Sem data</Badge>;
}

export default function HealthExams() {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const exams = useHealthExams();
  const settings = useHealthExamSettings();
  const del = useDeleteHealthExam();

  const alertMap = useMemo(() => {
    const m = new Map<HealthExamType, number>();
    (settings.data ?? []).forEach((s) => m.set(s.exam_type, s.alert_days_before));
    return m;
  }, [settings.data]);

  // Latest exam per employee+type is what defines conformance; but we show all rows here.
  const rows = useMemo(() => {
    const list = exams.data ?? [];
    return list.filter((e) => {
      if (typeFilter !== "all" && e.exam_type !== typeFilter) return false;
      const name = e.employee?.full_name?.toLowerCase() ?? "";
      if (search && !name.includes(search.toLowerCase())) return false;
      const status = getExamStatus(e.next_exam_date, alertMap.get(e.exam_type) ?? 60);
      if (tab === "expired" && status !== "expired") return false;
      if (tab === "expiring" && status !== "expiring") return false;
      if (tab === "valid" && status !== "valid") return false;
      return true;
    });
  }, [exams.data, tab, search, typeFilter, alertMap]);

  const counters = useMemo(() => {
    const list = exams.data ?? [];
    let valid = 0, expiring = 0, expired = 0;
    list.forEach((e) => {
      const s = getExamStatus(e.next_exam_date, alertMap.get(e.exam_type) ?? 60);
      if (s === "valid") valid++;
      else if (s === "expiring") expiring++;
      else if (s === "expired") expired++;
    });
    return { valid, expiring, expired, total: list.length };
  }, [exams.data, alertMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            Exames Ocupacionais (SST)
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de ASO conforme NR-7 / PCMSO. Admissional, periódico, mudança de função, retorno ao trabalho e demissional.
          </p>
        </div>
        <ExamDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Registrar Exame
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{counters.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Válidos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{counters.valid}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4 text-amber-600" />A vencer</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{counters.expiring}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-600" />Vencidos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-red-600">{counters.expired}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={tab} onValueChange={setTab} className="flex-1">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="expired">Vencidos</TabsTrigger>
                <TabsTrigger value="expiring">A vencer</TabsTrigger>
                <TabsTrigger value="valid">Válidos</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.keys(examTypeLabel) as HealthExamType[]).map((t) => (
                  <SelectItem key={t} value={t}>{examTypeLabel[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <TabsContent value={tab} forceMount>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Próximo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Clínica / Médico</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                )}
                {!exams.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum exame encontrado.</TableCell></TableRow>
                )}
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.employee?.full_name ?? "—"}
                      {e.employee?.position && (
                        <div className="text-xs text-muted-foreground">{e.employee.position}</div>
                      )}
                    </TableCell>
                    <TableCell>{examTypeLabel[e.exam_type]}</TableCell>
                    <TableCell>{format(parseISO(e.exam_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell>
                      {e.next_exam_date
                        ? format(parseISO(e.next_exam_date), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge nextDate={e.next_exam_date} alertDays={alertMap.get(e.exam_type) ?? 60} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={examResultVariant[e.result]}>{examResultLabel[e.result]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.clinic_name ?? "—"}
                      {e.doctor_name && <div className="text-xs text-muted-foreground">Dr(a). {e.doctor_name} {e.doctor_crm ? `— CRM ${e.doctor_crm}` : ""}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {e.attachment_path && (
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Baixar anexo"
                            onClick={() => downloadHealthExamAttachment(e.attachment_path!, e.attachment_name ?? "aso.pdf")}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <ExamDialog
                          initial={e}
                          trigger={
                            <Button size="icon" variant="ghost" title="Editar">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir exame?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O anexo também será removido.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(e.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Periodicidade Configurada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodicidade (meses)</TableHead>
                <TableHead>Alerta (dias antes)</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(settings.data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{examTypeLabel[s.exam_type]}</TableCell>
                  <TableCell>{s.periodicity_months || "—"}</TableCell>
                  <TableCell>{s.alert_days_before}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
