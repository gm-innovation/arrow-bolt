import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Smile, ExternalLink } from "lucide-react";
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

export default function Satisfaction() {
  const { campaigns, isLoading, create } = useSatisfactionCampaigns();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", starts_at: "", ends_at: "" });

  const onSubmit = async () => {
    if (!form.name || !form.starts_at || !form.ends_at) return;
    await create.mutateAsync(form);
    setOpen(false);
    setForm({ name: "", description: "", starts_at: "", ends_at: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smile className="h-6 w-6 text-primary" />
            Satisfação do Cliente
          </h1>
          <p className="text-sm text-muted-foreground">
            Campanhas de NPS e CSAT para clientes (ISO 9001 §9.1.2).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
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
                  placeholder="Objetivo, público, contexto..."
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
              <Button onClick={onSubmit} disabled={create.isPending}>
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma campanha cadastrada. Crie a primeira para começar a coletar NPS e CSAT.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.starts_at).toLocaleDateString("pt-BR")} —{" "}
                  {new Date(c.ends_at).toLocaleDateString("pt-BR")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Convites</p>
                    <p className="text-lg font-semibold">{c.invites_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Respostas</p>
                    <p className="text-lg font-semibold">{c.responses_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">NPS médio</p>
                    <p className="text-lg font-semibold">
                      {c.avg_nps != null ? c.avg_nps.toFixed(1) : "—"}
                    </p>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/quality/satisfaction/${c.id}`}>
                    Abrir <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
