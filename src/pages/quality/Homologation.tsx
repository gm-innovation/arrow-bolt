import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Plus, ExternalLink, CheckCircle2, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useQualityHomologations,
  type HomologationStatus,
  type QualityHomologation,
} from "@/hooks/useQualityHomologations";
import NewHomologationDialog from "@/components/quality/NewHomologationDialog";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_LABEL: Record<HomologationStatus, string> = {
  em_andamento: "Em andamento",
  homologado: "Homologado",
  homologado_com_ressalvas: "Homologado c/ ressalvas",
  reprovado: "Reprovado",
};

const STATUS_VARIANT: Record<HomologationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  em_andamento: "secondary",
  homologado: "default",
  homologado_com_ressalvas: "outline",
  reprovado: "destructive",
};

const Homologation = () => {
  const { userRole } = useAuth();
  const { list, update, remove, getSignedUrl } = useQualityHomologations();
  const [open, setOpen] = useState(false);

  const canDelete = userRole === "director" || userRole === "super_admin";

  const openPdf = async (h: QualityHomologation) => {
    if (!h.pdf_path) return;
    const url = await getSignedUrl(h.pdf_path);
    if (url) window.open(url, "_blank");
  };

  const sign = async (h: QualityHomologation) => {
    await update.mutateAsync({ id: h.id, sign: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Homologação do SGQ</h1>
          <p className="text-sm text-muted-foreground">
            Registro formal das homologações do Sistema de Gestão da Qualidade por ciclo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a
              href="https://github.com/"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  "/docs/sgq-homologacao-roteiro.md",
                  "_blank"
                );
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Roteiro de homologação
            </a>
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova homologação
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (list.data || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma homologação registrada. Use o botão “Nova homologação” para criar a primeira.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Assinada em</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(list.data || []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.cycle}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[h.status]}>{STATUS_LABEL[h.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(parseISO(h.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {h.signed_at
                        ? format(parseISO(h.signed_at), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {h.pdf_path ? (
                        <Button variant="ghost" size="sm" onClick={() => openPdf(h)}>
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Abrir
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!h.signed_at && (
                        <Button variant="outline" size="sm" onClick={() => sign(h)}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Marcar como assinada
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover esta homologação?")) {
                              remove.mutate(h.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewHomologationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default Homologation;
