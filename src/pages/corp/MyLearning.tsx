import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraduationCap, BookOpen, Award, Play, ArrowLeft, Download, Loader2, Eye } from 'lucide-react';
import { useMyEnrollments, useMyCertificates, useCertificateUserData } from '@/hooks/useUniversity';
import { pdf } from '@react-pdf/renderer';
import CertificatePDF from '@/components/university/CertificatePDF';
import { PDFCanvasViewer } from '@/components/ui/PDFCanvasViewer';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  not_started: { label: 'Não iniciado', variant: 'secondary' },
  in_progress: { label: 'Em andamento', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
};

const MyLearning = () => {
  const navigate = useNavigate();
  const { data: enrollments, isLoading: loadingEnrollments } = useMyEnrollments();
  const { data: certificates, isLoading: loadingCerts } = useMyCertificates();
  const { data: certUserData } = useCertificateUserData();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const activeEnrollments = enrollments?.filter(e => e.status !== 'completed') || [];
  const completedEnrollments = enrollments?.filter(e => e.status === 'completed') || [];

  const generateCertBlob = async (cert: any) => {
    if (!certUserData) return null;
    return pdf(
      <CertificatePDF
        userName={certUserData.userName}
        courseTitle={cert.course?.title || 'Curso'}
        issuedAt={cert.issued_at!}
        certificateCode={cert.certificate_code || ''}
        companyName={certUserData.companyName}
        companyLogoUrl={certUserData.companyLogoUrl}
        durationMinutes={cert.course?.duration_minutes}
        hrSignerName={certUserData.hrSignerName}
        directorSignerName={certUserData.directorSignerName}
      />
    ).toBlob();
  };

  const handleDownloadCertificate = async (cert: any) => {
    setDownloadingId(cert.id);
    try {
      const blob = await generateCertBlob(cert);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${cert.certificate_code || cert.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erro ao gerar certificado:', e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreviewCertificate = async (cert: any) => {
    setPreviewLoading(cert.id);
    try {
      const blob = await generateCertBlob(cert);
      if (!blob) return;
      setPreviewBlob(blob);
      setPreviewTitle(cert.course?.title || 'Certificado');
      setPreviewOpen(true);
    } catch (e) {
      console.error('Erro ao gerar preview:', e);
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/corp/university')}><ArrowLeft className="h-4 w-4" /></Button>
        <GraduationCap className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Meu Aprendizado</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{enrollments?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Cursos Matriculados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Play className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{activeEnrollments.length}</p>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Award className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{certificates?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Certificados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Em Andamento ({activeEnrollments.length})</TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({completedEnrollments.length})</TabsTrigger>
          <TabsTrigger value="certificates">Certificados ({certificates?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {loadingEnrollments ? <p className="text-muted-foreground py-4">Carregando...</p> : !activeEnrollments.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum curso em andamento.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {activeEnrollments.map(e => {
                const s = STATUS_MAP[e.status || 'not_started'];
                return (
                  <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/corp/university/course/${e.course_id}`)}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{e.course?.title}</CardTitle>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {e.is_mandatory && <Badge variant="destructive" className="mb-2">Obrigatório</Badge>}
                      <p className="text-sm text-muted-foreground">{e.course?.category}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {!completedEnrollments.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum curso concluído.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {completedEnrollments.map(e => (
                <Card key={e.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{e.course?.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">Concluído</Badge>
                    {e.completed_at && <p className="text-xs text-muted-foreground mt-1">em {new Date(e.completed_at).toLocaleDateString('pt-BR')}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          {loadingCerts ? <p className="text-muted-foreground py-4">Carregando...</p> : !certificates?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum certificado emitido.</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {certificates.map(cert => (
                <Card key={cert.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Award className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">{cert.course?.title}</p>
                        <p className="text-xs text-muted-foreground">Código: {cert.certificate_code}</p>
                        <p className="text-xs text-muted-foreground">Emitido em {new Date(cert.issued_at!).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewCertificate(cert)}
                          disabled={previewLoading === cert.id}
                        >
                          {previewLoading === cert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadCertificate(cert)}
                          disabled={downloadingId === cert.id}
                        >
                          {downloadingId === cert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Certificate Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Certificado — {previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <PDFCanvasViewer blob={previewBlob} className="h-full" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyLearning;
