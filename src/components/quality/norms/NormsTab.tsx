import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, AlertTriangle, Download } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQualityReferenceNorms, type QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";
import { useControlledDocMeta } from "@/hooks/useControlledDocMeta";
import NormFormDialog from "./NormFormDialog";
import QualityPdfPreviewButton from "../pdf/QualityPdfPreviewButton";
import NormsRegisterPdf from "../pdf/NormsRegisterPdf";

const fmt = (d?: string | null) => (d ? format(parseISO(d), "dd/MM/yyyy") : "—");

export const NormsTab = () => {
  const { norms, isLoading, remove } = useQualityReferenceNorms();
  const { baseMeta } = useControlledDocMeta();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<QualityReferenceNorm | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return norms;
    return norms.filter((n) => n.code.toLowerCase().includes(t) || n.title.toLowerCase().includes(t) || (n.issuer || "").toLowerCase().includes(t));
  }, [norms, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle>Referências Normativas</CardTitle>
          <p className="text-sm text-muted-foreground">Normas, regulamentos e documentos externos aplicáveis ao SGQ.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {baseMeta.companyName && (
            <QualityPdfPreviewButton
              buttonLabel="Imprimir Lista"
              dialogTitle="Lista Mestra de Normas"
              fileName="lista-normas.pdf"
              document={<NormsRegisterPdf meta={baseMeta as any} norms={filtered} />}
            />
          )}
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Norma
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhuma norma cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Revisão</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Próx. Revisão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => {
                const due = (n as any).next_review_due_at as string | null;
                const days = due ? differenceInDays(parseISO(due), new Date()) : null;
                const status = (n as any).effective_status as
                  | "vigente"
                  | "vence_em_breve"
                  | "vencida"
                  | "inativa"
                  | undefined;
                const daysToExpire = n.valid_until
                  ? differenceInDays(parseISO(n.valid_until), new Date())
                  : null;
                const rowDim = status === "vencida" || status === "inativa" ? "opacity-70" : "";
                const renderStatusBadge = () => {
                  if (status === "vencida") {
                    return (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        VENCIDA{n.valid_until ? ` desde ${fmt(n.valid_until)}` : ""}
                      </Badge>
                    );
                  }
                  if (status === "vence_em_breve") {
                    return (
                      <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600 text-white border-transparent">
                        <AlertTriangle className="h-3 w-3" />
                        {daysToExpire != null ? `vence em ${daysToExpire} dia(s)` : "vence em breve"}
                      </Badge>
                    );
                  }
                  if (status === "inativa" || !n.is_active) {
                    return <Badge variant="secondary">Inativa</Badge>;
                  }
                  return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">Vigente</Badge>;
                };
                return (
                  <TableRow key={n.id} className={rowDim}>
                    <TableCell className="font-mono">{n.code}</TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>{n.issuer || "—"}</TableCell>
                    <TableCell>{(n as any).revision || "—"}</TableCell>
                    <TableCell className="text-sm">{fmt(n.valid_from)} → {fmt(n.valid_until)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {fmt(due)}
                        {typeof days === "number" && days <= 30 && (
                          <AlertTriangle className={`h-4 w-4 ${days < 0 ? "text-destructive" : "text-yellow-600"}`} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{renderStatusBadge()}</TableCell>
                    <TableCell className="text-right">
                      {(n as any).attachment_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={(n as any).attachment_name || "Abrir arquivo"}
                          onClick={async () => {
                            const { data, error } = await supabase.storage
                              .from("quality-norms")
                              .createSignedUrl((n as any).attachment_url, 60 * 5);
                            if (error || !data?.signedUrl) {
                              toast({ title: "Erro ao abrir arquivo", description: error?.message, variant: "destructive" });
                              return;
                            }
                            window.open(data.signedUrl, "_blank");
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(n); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${n.code}?`)) remove.mutate(n.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <NormFormDialog open={open} onOpenChange={setOpen} norm={editing} />
    </Card>
  );
};

export default NormsTab;
