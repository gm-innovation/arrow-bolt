import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ExternalLink } from "lucide-react";
import { useSatisfactionCampaigns, CampaignStatus } from "@/hooks/useSatisfactionCampaigns";

const statusLabel: Record<CampaignStatus, string> = {
  draft: "Rascunho",
  active: "Ativa",
  closed: "Encerrada",
};
const statusVariant: Record<CampaignStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  active: "default",
  closed: "secondary",
};

export default function CampaignsTab() {
  const { campaigns, isLoading, create } = useSatisfactionCampaigns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", starts_at: "", ends_at: "" });

  const submit = async () => {
    if (!form.name || !form.starts_at || !form.ends_at) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", description: "", starts_at: "", ends_at: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Campanhas de NPS/CSAT para coleta estruturada de feedback.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova campanha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova campanha de satisfação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Pesquisa Anual 2026"
                />
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fim</Label>
                  <Input
                    type="date"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={create.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : campaigns.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma campanha cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Convites</TableHead>
                  <TableHead className="text-center">Respostas</TableHead>
                  <TableHead className="text-center">NPS médio</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(c.starts_at).toLocaleDateString("pt-BR")} —{" "}
                      {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{c.invites_count ?? 0}</TableCell>
                    <TableCell className="text-center">{c.responses_count ?? 0}</TableCell>
                    <TableCell className="text-center">
                      {c.avg_nps != null ? c.avg_nps.toFixed(1) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/quality/satisfaction/${c.id}`}>
                          Abrir <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
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
