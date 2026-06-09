import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useQualityTerms, useQualityReferenceNorms, type QualityTerm } from "@/hooks/useQualityIsoStructure";
import { useControlledDocMeta } from "@/hooks/useControlledDocMeta";
import TermFormDialog from "./TermFormDialog";
import QualityPdfPreviewButton from "../pdf/QualityPdfPreviewButton";
import TermsGlossaryPdf from "../pdf/TermsGlossaryPdf";

export const TermsTab = () => {
  const { terms, isLoading, remove } = useQualityTerms();
  const { norms } = useQualityReferenceNorms();
  const { baseMeta } = useControlledDocMeta();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<QualityTerm | null>(null);
  const [open, setOpen] = useState(false);

  const normMap = useMemo(() => new Map(norms.map((n) => [n.id, n.code])), [norms]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return terms;
    return terms.filter((x) => x.term.toLowerCase().includes(t) || x.definition.toLowerCase().includes(t));
  }, [terms, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
        <div>
          <CardTitle>Termos e Definições</CardTitle>
          <p className="text-sm text-muted-foreground">Vocabulário comum do SGQ. Reutilizável em formulários e documentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {baseMeta.companyName && (
            <QualityPdfPreviewButton
              buttonLabel="Imprimir Glossário"
              dialogTitle="Glossário de Termos"
              fileName="glossario-termos.pdf"
              document={<TermsGlossaryPdf meta={baseMeta as any} terms={filtered} norms={norms} />}
            />
          )}
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo Termo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum termo cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Termo</TableHead>
                <TableHead>Definição</TableHead>
                <TableHead className="w-40">Fonte</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-semibold">{t.term}</TableCell>
                  <TableCell className="text-sm">{t.definition}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.source_norm_id ? normMap.get(t.source_norm_id) || "—" : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Remover ${t.term}?`)) remove.mutate(t.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <TermFormDialog open={open} onOpenChange={setOpen} term={editing} />
    </Card>
  );
};

export default TermsTab;
