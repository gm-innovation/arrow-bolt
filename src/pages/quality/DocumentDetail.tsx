import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  FileText,
  History,
  Lock,
  Activity,
  Printer,
  Send,
  CheckCircle2,
  Archive,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import { useQualityDocument } from "@/hooks/useQualityDocuments";
import { useQualitySignature } from "@/hooks/useQualitySignature";
import { RichTextEditor } from "@/components/quality/RichTextEditor";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import DocumentPermissionsPanel from "@/components/quality/DocumentPermissionsPanel";
import DocumentAccessLogPanel from "@/components/quality/DocumentAccessLogPanel";
import DocumentControlledCopiesPanel from "@/components/quality/DocumentControlledCopiesPanel";
import { PDFCanvasViewer } from "@/components/ui/PDFCanvasViewer";
import { pdf } from "@react-pdf/renderer";
import { QualityDocumentPDF } from "@/components/quality/QualityDocumentPDF";
import { useAuth } from "@/contexts/AuthContext";
import { logQualityDocumentAccess } from "@/lib/qualityAccessLog";

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  published: "Publicado",
  obsolete: "Obsoleto",
  archived: "Arquivado",
};

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

const QualityDocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { document, versions, isLoading, createVersion, submitForApproval, approveAndPublish, markObsolete } =
    useQualityDocument(id);
  const { signature, registerSignatureEvent } = useQualitySignature();

  const [richContent, setRichContent] = useState<any>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [revisionLabel, setRevisionLabel] = useState("1.0");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const activeVersion = versions[0] || null;

  useEffect(() => {
    if (activeVersion) {
      setRichContent(activeVersion.rich_content || null);
      setRevisionLabel(`${activeVersion.revision_number + 1}.0`);
    } else {
      setRevisionLabel("1.0");
    }
  }, [activeVersion?.id]);

  if (isLoading || !document) {
    return <p className="text-muted-foreground text-center py-12">Carregando documento...</p>;
  }

  const createDraftVersion = async (kind: "rich_text" | "file") => {
    if (kind === "rich_text") {
      await createVersion.mutateAsync({
        revision_label: revisionLabel,
        content_kind: "rich_text",
        rich_content: richContent,
        change_summary: changeSummary || undefined,
      });
    } else if (uploadFile) {
      const path = `${document.id}/${Date.now()}_${sanitize(uploadFile.name)}`;
      const { error } = await supabase.storage
        .from("quality-documents")
        .upload(path, uploadFile, { upsert: false });
      if (error) {
        alert("Erro ao enviar arquivo: " + error.message);
        return;
      }
      await createVersion.mutateAsync({
        revision_label: revisionLabel,
        content_kind: "file",
        file_path: path,
        file_name: uploadFile.name,
        file_mime: uploadFile.type,
        file_size: uploadFile.size,
        change_summary: changeSummary || undefined,
      });
      setUploadFile(null);
    }
    setChangeSummary("");
  };

  const approveCurrent = async () => {
    if (!activeVersion) return;
    if (!signature) {
      alert("Cadastre sua assinatura em 'Minha Assinatura' antes de aprovar.");
      return;
    }
    const evt = await registerSignatureEvent({
      document_id: document.id,
      version_id: activeVersion.id,
      action: "approval",
      notes: `Aprovação da revisão ${activeVersion.revision_label}`,
    });
    await approveAndPublish.mutateAsync({ versionId: activeVersion.id, signatureEventId: evt.id });
  };

  const downloadFile = async (path: string, filename: string) => {
    const { data } = await supabase.storage.from("quality-documents").createSignedUrl(path, 300, {
      download: filename,
    });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quality/documents")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à lista
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono">{document.code}</Badge>
                  <Badge>{statusLabel[document.status]}</Badge>
                  {document.widely_visible && <Badge variant="secondary">Visibilidade ampliada</Badge>}
                </div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.document_type?.name || "Sem tipo"}
                  {document.classification && ` · ${document.classification}`}
                  {document.normative_reference && ` · ${document.normative_reference}`}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeVersion?.status === "draft" && (
                  <Button variant="outline" onClick={() => submitForApproval.mutate(activeVersion.id)}>
                    <Send className="h-4 w-4 mr-2" /> Enviar para aprovação
                  </Button>
                )}
                {activeVersion?.status === "pending_approval" && (
                  <Button onClick={approveCurrent}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar e Publicar
                  </Button>
                )}
                {document.status === "published" && (
                  <Button variant="destructive" onClick={() => markObsolete.mutate()}>
                    <Archive className="h-4 w-4 mr-2" /> Marcar obsoleto
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm">
              <div>
                <p className="text-muted-foreground">Publicado em</p>
                <p className="font-medium">
                  {document.published_at ? format(parseISO(document.published_at), "dd/MM/yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Próxima revisão</p>
                <p className="font-medium">
                  {document.next_review_date ? format(parseISO(document.next_review_date), "dd/MM/yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Revisão atual</p>
                <p className="font-medium">{activeVersion?.revision_label || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total de versões</p>
                <p className="font-medium">{versions.length}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-1" /> Conteúdo
            </TabsTrigger>
            <TabsTrigger value="versions">
              <History className="h-4 w-4 mr-1" /> Versões
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Lock className="h-4 w-4 mr-1" /> Permissões
            </TabsTrigger>
            <TabsTrigger value="copies">
              <Printer className="h-4 w-4 mr-1" /> Cópias Controladas
            </TabsTrigger>
            <TabsTrigger value="log">
              <Activity className="h-4 w-4 mr-1" /> Log de Acesso
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Editor (rich-text)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Edite o conteúdo e crie uma nova versão. A versão atual em rascunho pode ser ajustada antes de enviar para aprovação.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <RichTextEditor value={richContent} onChange={(json) => setRichContent(json)} />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="border rounded-md px-3 py-2 text-sm"
                    placeholder="Rótulo da nova revisão (ex.: 1.0, 2.0)"
                    value={revisionLabel}
                    onChange={(e) => setRevisionLabel(e.target.value)}
                  />
                  <input
                    className="border rounded-md px-3 py-2 text-sm"
                    placeholder="Resumo das alterações"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                  />
                </div>
                <Button onClick={() => createDraftVersion("rich_text")} disabled={createVersion.isPending}>
                  Salvar como nova versão (rascunho)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ou: anexar arquivo (Word/PDF)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use o upload quando o documento já existir fora do sistema. O Arrow controla versão, expiração, permissões e cópias da mesma forma.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative inline-block">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadFile ? uploadFile.name : "Escolher arquivo"}
                  </Button>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="opacity-0 absolute inset-0 cursor-pointer"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button onClick={() => createDraftVersion("file")} disabled={!uploadFile || createVersion.isPending}>
                  Salvar como nova versão (rascunho)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="versions">
            <Card>
              <CardContent className="pt-6">
                {versions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">Nenhuma versão ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between border rounded-md p-3">
                        <div>
                          <p className="font-medium">
                            Revisão {v.revision_label}{" "}
                            <Badge variant="outline" className="ml-2">
                              {statusLabel[v.status]}
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Emitida {v.issued_at ? format(parseISO(v.issued_at), "dd/MM/yyyy HH:mm") : "—"}
                            {v.approved_at && ` · Aprovada ${format(parseISO(v.approved_at), "dd/MM/yyyy HH:mm")}`}
                            {v.change_summary && ` · ${v.change_summary}`}
                          </p>
                        </div>
                        {v.content_kind === "file" && v.file_path && (
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(v.file_path!, v.file_name!)}>
                            Baixar arquivo
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <DocumentPermissionsPanel documentId={document.id} />
          </TabsContent>

          <TabsContent value="copies">
            <DocumentControlledCopiesPanel documentId={document.id} currentVersionId={document.current_version_id} />
          </TabsContent>

          <TabsContent value="log">
            <DocumentAccessLogPanel documentId={document.id} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default QualityDocumentDetail;
