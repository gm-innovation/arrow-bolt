import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, AlertTriangle, FolderOpen } from "lucide-react";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import NewDocumentDialog from "@/components/quality/NewDocumentDialog";
import NormsTab from "@/components/quality/norms/NormsTab";
import TermsTab from "@/components/quality/terms/TermsTab";
import { format, differenceInDays, parseISO } from "date-fns";

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  published: "Publicado",
  obsolete: "Obsoleto",
  archived: "Arquivado",
};

const statusVariant = (s: string): any =>
  s === "published" ? "default" : s === "draft" ? "secondary" : s === "pending_approval" ? "outline" : "destructive";

const MasterListSection = () => {
  const { documents, isLoading } = useQualityDocuments();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return documents;
    return documents.filter(
      (d: any) => d.code.toLowerCase().includes(term) || d.title.toLowerCase().includes(term)
    );
  }, [documents, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle>Lista Mestra</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por código ou título" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> Novo Documento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum documento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Próxima Revisão</TableHead>
                <TableHead>Visibilidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d: any) => {
                const days =
                  d.next_review_date && differenceInDays(parseISO(d.next_review_date), new Date());
                return (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/quality/documents/${d.id}`)}
                  >
                    <TableCell className="font-mono">{d.code}</TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.document_type?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(d.status)}>{statusLabel[d.status]}</Badge>
                    </TableCell>
                    <TableCell>{d.published_at ? format(parseISO(d.published_at), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      {d.next_review_date ? (
                        <div className="flex items-center gap-1">
                          {format(parseISO(d.next_review_date), "dd/MM/yyyy")}
                          {typeof days === "number" && days <= 30 && (
                            <AlertTriangle
                              className={`h-4 w-4 ${days < 0 ? "text-destructive" : "text-yellow-600"}`}
                            />
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {d.widely_visible ? <Badge variant="outline">Ampliada</Badge> : <Badge variant="secondary">Restrita</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <NewDocumentDialog open={showNew} onOpenChange={setShowNew} onCreated={(id) => navigate(`/quality/documents/${id}`)} />
    </Card>
  );
};

const QualityDocuments = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="h-6 w-6" /> Documentos da Qualidade
        </h2>
        <p className="text-muted-foreground">
          Documentos controlados do SGQ. Normas, termos e lista mestra estão disponíveis no menu lateral.
        </p>
      </div>

      <MasterListSection />
    </div>
  );
};

export default QualityDocuments;

