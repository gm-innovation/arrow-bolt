import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, AlertTriangle, Link2 } from "lucide-react";
import {
  useQualityComplaint,
  useQualityComplaints,
  ComplaintStatus,
} from "@/hooks/useQualityComplaints";

const statusOptions: { value: ComplaintStatus; label: string }[] = [
  { value: "new", label: "Nova" },
  { value: "acknowledged", label: "Reconhecida" },
  { value: "under_analysis", label: "Em análise" },
  { value: "resolved", label: "Resolvida" },
  { value: "rejected", label: "Rejeitada" },
];

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: complaint, isLoading } = useQualityComplaint(id);
  const { update, convertToNcr } = useQualityComplaints();

  const [status, setStatus] = useState<ComplaintStatus>("new");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setNotes(complaint.resolution_notes ?? "");
    }
  }, [complaint]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!complaint) return <p className="text-sm text-muted-foreground">Reclamação não encontrada.</p>;

  const save = () => {
    update.mutate({
      id: complaint.id,
      patch: {
        status,
        resolution_notes: notes,
        acknowledged_at:
          complaint.acknowledged_at ?? (status !== "new" ? new Date().toISOString() : null),
        resolved_at:
          status === "resolved" || status === "rejected"
            ? complaint.resolved_at ?? new Date().toISOString()
            : null,
      } as any,
    });
  };

  const handleConvert = async () => {
    const ncrId = await convertToNcr.mutateAsync(complaint.id);
    if (ncrId) navigate(`/quality/ncrs`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3 h-8">
            <Link to="/quality/complaints">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            <span className="font-mono text-muted-foreground mr-2">#{complaint.complaint_number}</span>
            {complaint.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Recebida em {new Date(complaint.received_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          {complaint.linked_ncr_id ? (
            <Badge variant="secondary">
              <Link2 className="h-3 w-3 mr-1" /> Vinculada a NCR
            </Badge>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-2" /> Converter em NCR
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Converter em Não-Conformidade?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Uma NCR será aberta com base nesta reclamação e ficará vinculada a ela. Esta ação
                    não pode ser desfeita automaticamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConvert}>Confirmar conversão</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{complaint.description}</p>
            <div className="space-y-2">
              <Label>Notas de tratativa</Label>
              <Textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ações tomadas, análise de causa, decisão..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Reclamante</p>
              <p>
                {complaint.is_anonymous
                  ? "Anônimo"
                  : complaint.responder_name ?? complaint.client?.company_name ?? "—"}
              </p>
              {complaint.responder_email && !complaint.is_anonymous && (
                <p className="text-xs text-muted-foreground">{complaint.responder_email}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Origem</p>
              <p className="capitalize">{complaint.source}</p>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ComplaintStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={update.isPending} className="w-full">
              Salvar alterações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
