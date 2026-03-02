import { useState } from 'react';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCorpDocuments } from '@/hooks/useCorpDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DocumentUploadDialog from '@/components/corp/DocumentUploadDialog';

const docTypeLabels: Record<string, string> = {
  payslip: 'Holerite', benefits: 'Benefícios', declaration: 'Declaração',
  institutional: 'Institucional', medical_certificate: 'Atestado Médico',
  reimbursement_proof: 'Comprovante', signed_form: 'Formulário', other: 'Outro',
};

const CorpDocuments = () => {
  const { user, userRole } = useAuth();
  const { documents, isLoading, deleteDocument } = useCorpDocuments();
  const isHR = userRole === 'hr' || userRole === 'admin' || userRole === 'super_admin';

  const myDocs = documents.filter((d: any) => d.uploaded_by === user?.id);
  const receivedDocs = documents.filter((d: any) => d.uploaded_by !== user?.id && d.owner_user_id === user?.id);
  const allDocs = documents;

  const companyId = (documents as any[])?.[0]?.company_id || '';

  const renderTable = (docs: any[]) => (
    docs.length === 0 ? (
      <div className="p-8 text-center text-muted-foreground">Nenhum documento encontrado.</div>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Departamento</TableHead>
            <TableHead className="hidden md:table-cell">Destinatário</TableHead>
            <TableHead className="hidden md:table-cell">Enviado por</TableHead>
            <TableHead className="hidden lg:table-cell">Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc: any) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.title}
                </div>
              </TableCell>
              <TableCell><Badge variant="secondary" size="sm">{docTypeLabels[doc.document_type] || doc.document_type}</Badge></TableCell>
              <TableCell className="hidden md:table-cell">{doc.department?.name || '—'}</TableCell>
              <TableCell className="hidden md:table-cell">{doc.owner?.full_name || '—'}</TableCell>
              <TableCell className="hidden md:table-cell">{doc.uploader?.full_name || '—'}</TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {format(new Date(doc.created_at), "dd/MM/yy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                  </Button>
                  {isHR && (
                    <Button variant="ghost" size="icon" onClick={() => deleteDocument.mutate(doc.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Documentos</h2>
          <div className="flex gap-2">
            <DocumentUploadDialog companyId={companyId} mode="self" />
            {isHR && <DocumentUploadDialog companyId={companyId} mode="hr" />}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="my">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-1">
                <TabsTrigger value="my">Meus Documentos</TabsTrigger>
                <TabsTrigger value="received">Recebidos</TabsTrigger>
                {isHR && <TabsTrigger value="all">Todos</TabsTrigger>}
              </TabsList>
              <TabsContent value="my" className="mt-0">
                {isLoading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : renderTable(myDocs)}
              </TabsContent>
              <TabsContent value="received" className="mt-0">
                {isLoading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : renderTable(receivedDocs)}
              </TabsContent>
              {isHR && (
                <TabsContent value="all" className="mt-0">
                  {isLoading ? <div className="p-6"><Skeleton className="h-40 w-full" /></div> : renderTable(allDocs)}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </CorpLayout>
  );
};

export default CorpDocuments;
