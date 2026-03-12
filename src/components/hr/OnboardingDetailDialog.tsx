import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, Download, Copy, Check, Eye } from 'lucide-react';
import { useOnboardingDocuments, useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PDFCanvasViewer } from '@/components/ui/PDFCanvasViewer';

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

const isImageFile = (fileName: string) =>
  /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);

const isPDFFile = (fileName: string) =>
  /\.pdf$/i.test(fileName);

const OnboardingDetailDialog = ({ process, open, onOpenChange }: OnboardingDetailDialogProps) => {
  const { documents, isLoading, reviewDocument } = useOnboardingDocuments(process.id);
  const { docTypes } = useOnboardingDocumentTypes();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const link = `${window.location.origin}/onboarding/${process.access_token}`;

  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('corp-documents')
      .createSignedUrl(filePath, 3600);
    if (error) {
      toast({ title: 'Erro ao gerar link', description: error.message, variant: 'destructive' });
      return null;
    }
    return data.signedUrl;
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = (docId: string) => {
    reviewDocument.mutate({ id: docId, status: 'approved' });
  };

  const handleReject = (docId: string) => {
    if (!rejectionReason.trim()) return;
    reviewDocument.mutate({ id: docId, status: 'rejected', rejection_reason: rejectionReason }, {
      onSuccess: () => { setRejectingId(null); setRejectionReason(''); },
    });
  };

  const handleDownload = async (doc: any) => {
    const url = await getSignedUrl(doc.file_url);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.target = '_blank';
      a.click();
    }
  };

  const handlePreview = async (doc: any) => {
    setLoadingPreview(true);
    setPreviewFileName(doc.file_name);

    try {
      if (isImageFile(doc.file_name)) {
        const url = await getSignedUrl(doc.file_url);
        if (url) {
          setPreviewType('image');
          setPreviewUrl(url);
          setPreviewBlob(null);
          setPreviewOpen(true);
        }
      } else if (isPDFFile(doc.file_name)) {
        const { data, error } = await supabase.storage
          .from('corp-documents')
          .download(doc.file_url);
        if (error) throw error;
        setPreviewType('pdf');
        setPreviewBlob(data);
        setPreviewUrl(null);
        setPreviewOpen(true);
      } else {
        // Fallback: just download
        await handleDownload(doc);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao abrir pré-visualização', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const submittedTypeIds = documents.map((d: any) => d.document_type_id);
  const missingTypes = docTypes.filter((dt: any) => !submittedTypeIds.includes(dt.id));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Admissão — {process.candidate_name || 'Candidato'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Link de acesso */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Link de acesso do candidato:</p>
              <div className="flex items-center gap-2">
                <Input value={link} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePreview(doc)}
                                disabled={loadingPreview}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(doc)}
                                title="Baixar"
                              >
                                <Download className="h-4 w-4" />
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {previewType === 'image' && previewUrl && (
              <img
                src={previewUrl}
                alt={previewFileName}
                className="max-w-full h-auto mx-auto rounded-md"
              />
            )}
            {previewType === 'pdf' && (
              <PDFCanvasViewer blob={previewBlob} className="h-[70vh]" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OnboardingDetailDialog;
