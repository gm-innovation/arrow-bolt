import { useState } from 'react';
import { useMyDocuments, useUploadEmployeeDocument, statusLabel, statusVariant, ComplianceRow } from '@/hooks/useHRDocumentCompliance';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Upload, ChevronDown, History } from 'lucide-react';
import { formatLocalDate } from '@/lib/utils';

const ReuploadDialog = ({ row }: { row: ComplianceRow }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const upload = useUploadEmployeeDocument();

  const submit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      employee_id: row.employee_id,
      catalog_id: row.catalog_id,
      file,
      issue_date: issueDate || null,
    });
    setOpen(false);
    setFile(null);
    setIssueDate('');
  };

  const label = row.status === 'missing' ? 'Enviar' : 'Substituir';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Upload className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.catalog_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Data de emissão (opcional)</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!file || upload.isPending}>
            {upload.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const MyHRDocumentsPanel = () => {
  const { data, isLoading } = useMyDocuments();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum documento exigido para o seu cargo.
        </CardContent>
      </Card>
    );
  }

  const lastRejection = (catalogId: string) =>
    data.history.find((h) => h.catalog_id === catalogId && h.review_status === 'rejected');

  const versions = (catalogId: string) =>
    data.history.filter((h) => h.catalog_id === catalogId);

  return (
    <div className="space-y-3">
      {data.rows.map((r) => {
        const rej = lastRejection(r.catalog_id);
        const vers = versions(r.catalog_id);
        return (
          <Card key={r.catalog_id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.catalog_name}</span>
                    <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                    <span className="text-xs text-muted-foreground">{r.catalog_category}</span>
                  </div>
                  {r.expiry_date && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Validade: {formatLocalDate(r.expiry_date)}
                      {r.due_in_days != null &&
                        ` (${r.due_in_days >= 0 ? `${r.due_in_days}d restantes` : `${Math.abs(r.due_in_days)}d vencido`})`}
                    </div>
                  )}
                  {r.status === 'missing' && rej?.rejection_reason && (
                    <div className="text-xs text-destructive mt-1">
                      Última rejeição: {rej.rejection_reason}
                    </div>
                  )}
                </div>
                <ReuploadDialog row={r} />
              </div>

              {vers.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                      <History className="h-3 w-3" /> Histórico ({vers.length})
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {vers.map((v) => (
                      <div key={v.id} className="text-xs text-muted-foreground flex items-center gap-2 border-l-2 pl-2">
                        <span>{new Date(v.uploaded_at).toLocaleDateString('pt-BR')}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {v.review_status === 'approved' ? 'Aprovado' : v.review_status === 'rejected' ? 'Rejeitado' : 'Aguardando'}
                        </Badge>
                        <span className="truncate">{v.file_name}</span>
                        {v.is_current && <Badge variant="secondary" className="text-[10px]">Atual</Badge>}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
