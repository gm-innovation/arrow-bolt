import { useState } from 'react';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Upload, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorpDocuments } from '@/hooks/useCorpDocuments';
import { useMyOnboarding, useOnboardingDocuments, useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const docTypeLabels: Record<string, string> = {
  payslip: 'Holerite', benefits: 'Benefícios', declaration: 'Declaração',
  institutional: 'Institucional', income_report: 'Informe de Rendimentos',
  contract: 'Contrato', other: 'Outro',
};

const sanitizeFileName = (name: string) =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

const CorpMyDocuments = () => {
  const { user } = useAuth();
  const { documents, isLoading: docsLoading } = useCorpDocuments();
  const { myOnboarding, isLoading: onbLoading } = useMyOnboarding();
  const { documents: onbDocs, isLoading: onbDocsLoading, uploadDocument } = useOnboardingDocuments(myOnboarding?.id);
  const { docTypes } = useOnboardingDocumentTypes();

  const receivedDocs = documents.filter((d: any) => d.owner_user_id === user?.id && d.uploaded_by !== user?.id);

  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submittedTypeIds = onbDocs.map((d: any) => d.document_type_id);

  const handleUploadOnboardingDoc = async () => {
    if (!file || !selectedTypeId || !myOnboarding?.id || !user) return;
    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `onboarding/${myOnboarding.id}/${Date.now()}_${safeName}`;
      const { error: storageError } = await supabase.storage.from('corp-documents').upload(path, file);
      if (storageError) throw storageError;
      const { data: urlData } = supabase.storage.from('corp-documents').getPublicUrl(path);
      uploadDocument.mutate({
        onboarding_id: myOnboarding.id,
        document_type_id: selectedTypeId,
        file_name: file.name,
        file_url: urlData.publicUrl,
      }, {
        onSuccess: () => { setFile(null); setSelectedTypeId(''); },
      });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const statusIcon: Record<string, any> = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    approved: <CheckCircle className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <CorpLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Meus Documentos</h2>

        <Tabs defaultValue="received">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-1">
            <TabsTrigger value="received">Recebidos do RH</TabsTrigger>
            {myOnboarding && <TabsTrigger value="onboarding">Admissão</TabsTrigger>}
          </TabsList>

          <TabsContent value="received" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {docsLoading ? (
                  <div className="p-6"><Skeleton className="h-40 w-full" /></div>
                ) : receivedDocs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Nenhum documento recebido.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden md:table-cell">Data</TableHead>
                        <TableHead>Download</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivedDocs.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {doc.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{docTypeLabels[doc.document_type] || doc.document_type}</Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {format(new Date(doc.created_at), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {myOnboarding && (
            <TabsContent value="onboarding" className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Enviar Documento de Admissão</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Label>Tipo de Documento *</Label>
                      <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {docTypes.filter((dt: any) => !submittedTypeIds.includes(dt.id)).map((dt: any) => (
                            <SelectItem key={dt.id} value={dt.id}>
                              {dt.name} {dt.is_required ? '(obrigatório)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label>Arquivo *</Label>
                      <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleUploadOnboardingDoc} disabled={!file || !selectedTypeId || uploading} className="gap-2">
                        <Upload className="h-4 w-4" /> {uploading ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  {onbDocsLoading ? (
                    <div className="p-6"><Skeleton className="h-32 w-full" /></div>
                  ) : (
                    <>
                      {onbDocs.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Documento</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden md:table-cell">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {onbDocs.map((doc: any) => (
                              <TableRow key={doc.id}>
                                <TableCell>
                                  <div className="font-medium">{doc.document_type?.name || doc.file_name}</div>
                                  <div className="text-xs text-muted-foreground">{doc.file_name}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {statusIcon[doc.status]}
                                    <span className="text-sm">{doc.status === 'pending' ? 'Pendente' : doc.status === 'approved' ? 'Aprovado' : 'Rejeitado'}</span>
                                  </div>
                                  {doc.rejection_reason && (
                                    <div className="text-xs text-destructive mt-1">{doc.rejection_reason}</div>
                                  )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-muted-foreground">
                                  {format(new Date(doc.uploaded_at), "dd/MM/yy", { locale: ptBR })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}

                      {docTypes.filter((dt: any) => !submittedTypeIds.includes(dt.id)).length > 0 && (
                        <div className="p-4 border-t">
                          <h4 className="text-sm font-medium mb-2">Documentos pendentes:</h4>
                          <div className="space-y-1">
                            {docTypes.filter((dt: any) => !submittedTypeIds.includes(dt.id)).map((dt: any) => (
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
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </CorpLayout>
  );
};

export default CorpMyDocuments;
