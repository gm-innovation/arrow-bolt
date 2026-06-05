import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, MessageSquareWarning } from "lucide-react";
import { useQualityComplaints, ComplaintSource, ComplaintStatus } from "@/hooks/useQualityComplaints";

const statusLabel: Record<ComplaintStatus, string> = {
  new: "Nova",
  acknowledged: "Reconhecida",
  under_analysis: "Em análise",
  resolved: "Resolvida",
  rejected: "Rejeitada",
};
const statusVariant: Record<ComplaintStatus, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  acknowledged: "secondary",
  under_analysis: "outline",
  resolved: "secondary",
  rejected: "destructive",
};

const sourceLabel: Record<ComplaintSource, string> = {
  survey: "Pesquisa",
  email: "E-mail",
  phone: "Telefone",
  in_person: "Presencial",
  system: "Sistema",
  other: "Outro",
};

export default function Complaints() {
  const { complaints, isLoading, create } = useQualityComplaints();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    source: "other" as ComplaintSource,
    is_anonymous: false,
    responder_name: "",
    responder_email: "",
  });

  const submit = async () => {
    if (!form.title || !form.description) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({
      title: "",
      description: "",
      source: "other",
      is_anonymous: false,
      responder_name: "",
      responder_email: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareWarning className="h-6 w-6 text-primary" />
            Reclamações
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro e tratamento de reclamações de clientes (ISO 9001 §8.2.1, §10.2).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova reclamação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar reclamação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Resumo da reclamação"
                />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detalhes do que ocorreu, impacto e contexto."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Origem</Label>
                  <Select
                    value={form.source}
                    onValueChange={(v) => setForm({ ...form, source: v as ComplaintSource })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(sourceLabel).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    id="anon"
                    checked={form.is_anonymous}
                    onCheckedChange={(c) => setForm({ ...form, is_anonymous: !!c })}
                  />
                  <Label htmlFor="anon" className="cursor-pointer">
                    Anônima
                  </Label>
                </div>
              </div>
              {!form.is_anonymous && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nome do reclamante</Label>
                    <Input
                      value={form.responder_name}
                      onChange={(e) => setForm({ ...form, responder_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.responder_email}
                      onChange={(e) => setForm({ ...form, responder_email: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={create.isPending}>
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : complaints.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma reclamação registrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recebida em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">#{c.complaint_number}</TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sourceLabel[c.source]}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.is_anonymous ? (
                        <span className="text-muted-foreground italic">Anônima</span>
                      ) : (
                        c.client?.company_name ?? c.responder_name ?? "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                    </TableCell>
                    <TableCell>{new Date(c.received_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/quality/complaints/${c.id}`}>Abrir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
