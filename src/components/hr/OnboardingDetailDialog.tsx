import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useOnboardingDocuments, useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OnboardingDetailDialogProps {
  process: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusIcon: Record<string, any> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

const OnboardingDetailDialog = ({ process, open, onOpenChange }: OnboardingDetailDialogProps) => {
  const { documents, isLoading, reviewDocument } = useOnboardingDocuments(process.id);
  const { docTypes } = useOnboardingDocumentTypes();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const handleApprove = (docId: string) => {
    reviewDocument.mutate({ id: docId, status: 'approved' });
  };

  const handleReject = (docId: string) => {
    if (!rejectionReason.trim()) return;
    reviewDocument.mutate({ id: docId, status: 'rejected', rejection_reason: rejectionReason }, {
      onSuccess: () => { setRejectingId(null); setRejectionReason(''); },
    });
  };

  const submittedTypeIds = documents.map((d: any) => d.document_type_id);
  const missingTypes = docTypes.filter((dt: any) => !submittedTypeIds.includes(dt.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Admissão — {process.employee?.full_name || 'Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {documents.length} de {docTypes.length} documentos enviados
          </div>

          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              {documents.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{doc.document_type?.name || doc.file_name}</div>
                            <div className="text-xs text-muted-foreground">{doc.file_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcon[doc.status]}
                            <span className="text-sm capitalize">{doc.status === 'pending' ? 'Pendente' : doc.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
                          </div>
                          {doc.rejection_reason && (
                            <div className="text-xs text-destructive mt-1">{doc.rejection_reason}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                            </Button>
                            {doc.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => handleApprove(doc.id)}>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setRejectingId(doc.id)}>
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                          {rejectingId === doc.id && (
                            <div className="flex gap-2 mt-2">
                              <Input
                                placeholder="Motivo da rejeição"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                className="text-sm"
                              />
                              <Button size="sm" variant="destructive" onClick={() => handleReject(doc.id)}>
                                Rejeitar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {missingTypes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Documentos pendentes de envio:</h4>
                  <div className="space-y-1">
                    {missingTypes.map((dt: any) => (
                      <div key={dt.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dt.name}
                        {dt.is_required && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDetailDialog;
