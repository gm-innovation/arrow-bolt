import { useMemo, useState } from "react";
import { formatLocalDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CheckCircle2, XCircle, Clock, FileSearch } from "lucide-react";
import {
  PendingReviewRow,
  useDocumentFileUrl,
  usePendingReviews,
  useReviewDocument,
} from "@/hooks/useHRDocumentCompliance";


const isPdf = (name: string) => /\.pdf$/i.test(name);
const isImage = (name: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);

const ReviewSheet = ({
  row,
  open,
  onOpenChange,
}: {
  row: PendingReviewRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const { data: url } = useDocumentFileUrl(row?.file_path);
  const review = useReviewDocument();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const close = () => {
    setRejecting(false);
    setReason("");
    onOpenChange(false);
  };

  const approve = async () => {
    if (!row) return;
    await review.mutateAsync({ document_id: row.document_id, decision: "approve" });
    close();
  };

  const reject = async () => {
    if (!row) return;
    if (!reason.trim()) return;
    await review.mutateAsync({
      document_id: row.document_id,
      decision: "reject",
      rejection_reason: reason.trim(),
    });
    close();
  };

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row?.catalog_name}</SheetTitle>
        </SheetHeader>
        {row && (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
              <div><span className="font-medium text-foreground">Colaborador:</span> {row.employee_name}</div>
              <div><span className="font-medium text-foreground">Cargo:</span> {row.employee_position ?? "—"}</div>
              <div><span className="font-medium text-foreground">Enviado em:</span> {new Date(row.uploaded_at).toLocaleString("pt-BR")}</div>
              <div><span className="font-medium text-foreground">Quem enviou:</span> {row.uploader_name ?? "—"}</div>
              {row.issue_date && (
                <div><span className="font-medium text-foreground">Emissão:</span> {formatLocalDate(row.issue_date)}</div>
              )}
              <div><span className="font-medium text-foreground">Arquivo:</span> {row.file_name}</div>
            </div>

            <div className="rounded-md border bg-muted/30 p-2 min-h-[300px]">
              {!url && <div className="text-center text-sm text-muted-foreground py-12">Carregando arquivo...</div>}
              {url && isPdf(row.file_name) && (
                <iframe src={url} title={row.file_name} className="w-full h-[60vh] rounded" />
              )}
              {url && isImage(row.file_name) && (
                <img src={url} alt={row.file_name} className="mx-auto max-h-[60vh] object-contain" />
              )}
              {url && !isPdf(row.file_name) && !isImage(row.file_name) && (
                <div className="text-center py-12">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Abrir arquivo em nova aba
                  </a>
                </div>
              )}
            </div>

            {rejecting && (
              <div className="space-y-2">
                <Label>Motivo da rejeição *</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explique o que o colaborador precisa corrigir."
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {rejecting ? (
                <>
                  <Button variant="ghost" onClick={() => setRejecting(false)} disabled={review.isPending}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={reject}
                    disabled={!reason.trim() || review.isPending}
                  >
                    Confirmar rejeição
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="destructive" onClick={() => setRejecting(true)} disabled={review.isPending}>
                    <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                  </Button>
                  <Button onClick={approve} disabled={review.isPending}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const DocumentReviews = () => {
  const { data, isLoading } = usePendingReviews();
  const [selected, setSelected] = useState<PendingReviewRow | null>(null);

  const counts = useMemo(() => ({ pending: data?.length ?? 0 }), [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revisão de Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Documentos enviados pelos colaboradores aguardando aprovação do RH.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Aguardando revisão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{counts.pending}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSearch className="h-4 w-4" /> Fila de revisão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Enviado em</TableHead>
                <TableHead>Quem enviou</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum documento aguardando revisão. 🎉
                  </TableCell>
                </TableRow>
              )}
              {data?.map((r) => (
                <TableRow
                  key={r.document_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(r)}
                >
                  <TableCell className="font-medium">{r.employee_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.employee_position ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{r.catalog_name}</span>
                      <Badge variant="secondary" className="text-xs">{r.catalog_category}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.uploaded_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.uploader_name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline">Revisar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReviewSheet
        row={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
};

export default DocumentReviews;
