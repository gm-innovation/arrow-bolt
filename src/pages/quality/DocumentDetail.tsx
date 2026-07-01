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
  BadgeCheck,
  AlertTriangle,
  BookMarked,
  Pencil,
  RotateCcw,
  Share2,
} from "lucide-react";


import { useQualityDocument, useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useQualityDocumentTypes } from "@/hooks/useQualityDocumentTypes";
import { addMonths } from "date-fns";
import { useQualitySignature } from "@/hooks/useQualitySignature";
import { useQualityDocumentNorms } from "@/hooks/useQualityDocumentNorms";
import DocumentNormsPanel from "@/components/quality/documents/DocumentNormsPanel";
import DocumentHistoryTimeline from "@/components/quality/documents/DocumentHistoryTimeline";
import { RichTextEditor } from "@/components/quality/RichTextEditor";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import DocumentPermissionsPanel from "@/components/quality/DocumentPermissionsPanel";
import DocumentAccessLogPanel from "@/components/quality/DocumentAccessLogPanel";
import DocumentControlledCopiesPanel from "@/components/quality/DocumentControlledCopiesPanel";
import DocumentAcknowledgementsPanel from "@/components/quality/DocumentAcknowledgementsPanel";
import DocumentPrerequisitesPanel from "@/components/quality/DocumentPrerequisitesPanel";
import { PDFCanvasViewer } from "@/components/ui/PDFCanvasViewer";
import { pdf } from "@react-pdf/renderer";
import { QualityDocumentPDF } from "@/components/quality/QualityDocumentPDF";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { logQualityDocumentAccess } from "@/lib/qualityAccessLog";
import { useDocumentPerms } from "@/hooks/useDocumentPerms";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import EditDocumentMetadataDialog from "@/components/quality/EditDocumentMetadataDialog";
import ShareDocumentDialog from "@/components/quality/ShareDocumentDialog";

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
  const { user, userRole } = useAuth();
  const canMarkObsolete = userRole === "qualidade" || userRole === "super_admin";
  const isMaster = userRole === "qualidade" || userRole === "super_admin";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { document, versions, isLoading, createVersion, submitForApproval, approveAndPublish, markObsolete, reactivate } =
    useQualityDocument(id);
  const { update } = useQualityDocuments();
  const { signature, registerSignatureEvent } = useQualitySignature();
  const { expiredNorms } = useQualityDocumentNorms(id);
  const { perms } = useDocumentPerms(id);

  const [richContent, setRichContent] = useState<any>(null);
  const [changeSummary, setChangeSummary] = useState("");
  const [revisionLabel, setRevisionLabel] = useState("1.0");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showObsoleteConfirm, setShowObsoleteConfirm] = useState(false);
  const [obsoleteReason, setObsoleteReason] = useState("");
  const [nextReviewOverride, setNextReviewOverride] = useState<string>("");
  const [editingNextReview, setEditingNextReview] = useState(false);
  const [nextReviewEditValue, setNextReviewEditValue] = useState("");
  const [pendingOfficeDownload, setPendingOfficeDownload] = useState<{ path: string; filename: string; mime?: string | null } | null>(null);

  const activeVersion = versions[0] || null;
  const publishedVersion = useMemo(
    () => versions.find((v) => v.status === "published") || null,
    [versions]
  );

  const { types: docTypes } = useQualityDocumentTypes();
  const effectiveControlMode: "controlled" | "uncontrolled" = useMemo(() => {
    const own = (document as any)?.control_mode as "controlled" | "uncontrolled" | null | undefined;
    if (own) return own;
    const typeId = (document as any)?.document_type_id;
    const t = docTypes.find((tt: any) => tt.id === typeId);
    return (t?.default_control_mode as any) || "controlled";
  }, [document, docTypes]);
  const viewerWatermark =
    effectiveControlMode === "uncontrolled" ? "CÓPIA NÃO CONTROLADA" : null;


  useEffect(() => {
    if (activeVersion) {
      setRichContent(activeVersion.rich_content || null);
      setRevisionLabel(`${activeVersion.revision_number + 1}.0`);
    } else {
      setRevisionLabel("1.0");
    }
  }, [activeVersion?.id]);

  // log de visualização ao abrir o documento
  useEffect(() => {
    if (document && user) {
      logQualityDocumentAccess({
        document_id: document.id,
        version_id: document.current_version_id,
        user_id: user.id,
        action: "view",
        context: { route: "detail" },
      });
    }
  }, [document?.id, user?.id]);

  if (isLoading || !document) {
    return <p className="text-muted-foreground text-center py-12">Carregando documento...</p>;
  }

  const recalcNextReview = async () => {
    if (!document?.published_at) {
      toast({ title: "Documento ainda não publicado", variant: "destructive" });
      return;
    }
    let months = 12;
    try {
      const { data: settings } = await supabase
        .from("quality_settings" as any)
        .select("review_cycles")
        .eq("company_id", document.company_id)
        .maybeSingle();
      const m = Number((settings as any)?.review_cycles?.document_review_months);
      if (m > 0) months = m;
    } catch (e) {
      console.warn("[quality] could not read review_cycles", e);
    }
    const next = addMonths(parseISO(document.published_at), months);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, "0");
    const dd = String(next.getDate()).padStart(2, "0");
    const nextStr = `${yyyy}-${mm}-${dd}`;
    await update.mutateAsync({ id: document.id, next_review_date: nextStr } as any);
    toast({ title: "Próxima revisão recalculada", description: format(next, "dd/MM/yyyy") });
  };

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
    await approveAndPublish.mutateAsync({
      versionId: activeVersion.id,
      signatureEventId: evt.id,
      nextReviewDateOverride: nextReviewOverride || null,
    });
    setNextReviewOverride("");
  };

  const isOfficeFile = (filename: string, mime?: string | null) => {
    const ext = filename.toLowerCase().split(".").pop() || "";
    if (["pdf", "png", "jpg", "jpeg", "webp", "gif", "txt"].includes(ext)) return false;
    if (mime && (mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/"))) return false;
    return ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "csv", "rtf"].includes(ext);
  };

  const performDownload = async (path: string, filename: string) => {
    const { data } = await supabase.storage.from("quality-documents").createSignedUrl(path, 300, {
      download: filename,
    });
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
      if (user) {
        logQualityDocumentAccess({
          document_id: document.id,
          version_id: activeVersion?.id ?? null,
          user_id: user.id,
          action: "download",
          context: { filename, control_mode: effectiveControlMode },
        });
      }
    }
  };

  const downloadFile = async (path: string, filename: string, mime?: string | null) => {
    if (!perms.can_download) {
      toast({
        title: "Sem permissão para baixar",
        description: "Sua conta não tem permissão para baixar este documento.",
        variant: "destructive",
      });
      if (user) {
        logQualityDocumentAccess({
          document_id: document.id,
          version_id: activeVersion?.id ?? null,
          user_id: user.id,
          action: "denied_download",
          context: { filename },
        });
      }
      return;
    }
    if (effectiveControlMode === "controlled" && isOfficeFile(filename, mime)) {
      setPendingOfficeDownload({ path, filename, mime });
      return;
    }
    await performDownload(path, filename);
  };

  const openIntegratedViewer = async () => {
    if (!activeVersion?.file_path) return;
    const { data } = await supabase.storage
      .from("quality-documents")
      .createSignedUrl(activeVersion.file_path, 300);
    if (data?.signedUrl) {
      const res = await fetch(data.signedUrl);
      setFileBlob(await res.blob());
      setShowViewer(true);
      if (user) {
        logQualityDocumentAccess({
          document_id: document.id,
          version_id: activeVersion.id,
          user_id: user.id,
          action: "view",
          context: { mode: "integrated_pdf_viewer" },
        });
      }
    }
  };

  const buildPDFBlob = async (opts: { watermark?: "uncontrolled" | "obsolete" | "draft" | null } = {}) => {
    const v = publishedVersion || activeVersion;
    if (!v) return null;
    const watermark =
      opts.watermark !== undefined
        ? opts.watermark
        : document.status === "obsolete"
        ? "obsolete"
        : v.status === "draft"
        ? "draft"
        : null;
    // resolve nomes
    const [{ data: prep }, { data: appr }, { data: comp }] = await Promise.all([
      v.prepared_by
        ? supabase.from("profiles").select("full_name").eq("id", v.prepared_by).maybeSingle()
        : Promise.resolve({ data: null } as any),
      v.approved_by
        ? supabase.from("profiles").select("full_name").eq("id", v.approved_by).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("companies").select("name").eq("id", document.company_id).maybeSingle(),
    ]);
    const doc = (
      <QualityDocumentPDF
        companyName={comp?.name || undefined}
        code={document.code}
        title={document.title}
        revisionLabel={v.revision_label}
        publishedAt={document.published_at}
        nextReviewDate={document.next_review_date}
        approverName={appr?.full_name || null}
        preparedByName={prep?.full_name || null}
        classification={document.classification}
        normativeReference={document.normative_reference}
        richContent={v.rich_content}
        watermark={watermark}
      />
    );
    return await pdf(doc as any).toBlob();
  };

  const downloadGeneratedPDF = async (watermark: "uncontrolled" | null = null) => {
    const requiredPerm = watermark === "uncontrolled" ? perms.can_print : perms.can_download;
    if (!requiredPerm) {
      toast({
        title: watermark === "uncontrolled" ? "Sem permissão para imprimir" : "Sem permissão para baixar",
        description: "Sua conta não tem permissão para esta ação neste documento.",
        variant: "destructive",
      });
      if (user) {
        logQualityDocumentAccess({
          document_id: document.id,
          version_id: activeVersion?.id ?? null,
          user_id: user.id,
          action: watermark === "uncontrolled" ? "denied_print" : "denied_download",
          context: { watermark },
        });
      }
      return;
    }
    const v = publishedVersion || activeVersion;
    if (!v) return;
    if (v.content_kind !== "rich_text") {
      alert("Esta versão é um arquivo anexado — use 'Baixar arquivo' na aba Versões.");
      return;
    }
    const blob = await buildPDFBlob({ watermark });
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${document.code}_rev${v.revision_label}${watermark === "uncontrolled" ? "_NAO_CONTROLADA" : ""}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    if (user) {
      logQualityDocumentAccess({
        document_id: document.id,
        version_id: v.id,
        user_id: user.id,
        action: watermark === "uncontrolled" ? "print" : "download",
        context: { watermark },
      });
    }
  };

  const viewGeneratedPDF = async () => {
    const blob = await buildPDFBlob({ watermark: null });
    if (!blob) return;
    setFileBlob(blob);
    setShowViewer(true);
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
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="font-mono">{document.code}</Badge>
                  <Badge>{statusLabel[document.status]}</Badge>
                  {document.widely_visible && <Badge variant="secondary">Visibilidade ampliada</Badge>}
                  {expiredNorms.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Norma Referenciada Vencida
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-0.5">
                          {expiredNorms.map((n: any) => (
                            <div key={n.id}><b>{n.code}</b> — {n.title}</div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {document.document_type?.name || "Sem tipo"}
                  {document.classification && ` · ${document.classification}`}
                  {document.normative_reference && ` · ${document.normative_reference}`}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {activeVersion?.content_kind === "rich_text" && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={viewGeneratedPDF}>
                          <Eye className="h-4 w-4 mr-1" /> Visualizar PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Visualização integrada (não conta como impressão)</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadGeneratedPDF(null)}
                            disabled={!perms.can_download}
                          >
                            <Download className="h-4 w-4 mr-1" /> Baixar PDF
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {perms.can_download
                          ? "Baixa o PDF controlado e registra no log"
                          : "Sem permissão para baixar este documento"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadGeneratedPDF("uncontrolled")}
                            disabled={!perms.can_print}
                          >
                            <Printer className="h-4 w-4 mr-1" /> Cópia não controlada
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {perms.can_print
                          ? 'Gera o PDF com marca d\'água "CÓPIA NÃO CONTROLADA"'
                          : "Sem permissão para imprimir este documento"}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {activeVersion?.content_kind === "file" && activeVersion.file_path && (
                  <>
                    <Button variant="outline" size="sm" onClick={openIntegratedViewer}>
                      <Eye className="h-4 w-4 mr-1" /> Visualizar arquivo
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(activeVersion.file_path!, activeVersion.file_name!, activeVersion.file_mime)}
                            disabled={!perms.can_download}
                          >
                            <Download className="h-4 w-4 mr-1" /> Baixar
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {perms.can_download ? "Baixa o arquivo original" : "Sem permissão para baixar este documento"}
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
                {activeVersion?.status === "draft" && (
                  <Button variant="outline" onClick={() => submitForApproval.mutate(activeVersion.id)}>
                    <Send className="h-4 w-4 mr-2" /> Enviar para aprovação
                  </Button>
                )}
                {activeVersion?.status === "pending_approval" && (
                  <div className="flex flex-wrap items-center gap-2 border rounded-md px-2 py-1 bg-muted/40">
                    <label className="text-xs text-muted-foreground">
                      Próxima revisão (opcional):
                    </label>
                    <input
                      type="date"
                      className="border rounded-md px-2 py-1 text-sm bg-background"
                      value={nextReviewOverride}
                      onChange={(e) => setNextReviewOverride(e.target.value)}
                    />
                    <Button onClick={approveCurrent}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar e Publicar
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar metadados
                </Button>
                {document.status === "published" && (
                  <Button variant="outline" size="sm" onClick={() => setShowShare(true)}>
                    <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                  </Button>
                )}
                {document.status === "published" && document.published_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={recalcNextReview}
                    disabled={update.isPending}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Recalcular próxima revisão
                  </Button>
                )}
                {document.status === "published" && canMarkObsolete && (
                  <Button variant="destructive" onClick={() => setShowObsoleteConfirm(true)}>
                    <Archive className="h-4 w-4 mr-2" /> Marcar obsoleto
                  </Button>
                )}
                {document.status === "obsolete" && (
                  <Button variant="outline" onClick={() => reactivate.mutate()} disabled={reactivate.isPending}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Reativar documento
                  </Button>
                )}
                {isMaster && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Excluir permanentemente (somente Master)"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" /> Excluir documento
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
                {editingNextReview ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      className="border rounded-md px-2 py-1 text-sm bg-background"
                      value={nextReviewEditValue}
                      onChange={(e) => setNextReviewEditValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={async () => {
                        await update.mutateAsync({
                          id: document.id,
                          next_review_date: nextReviewEditValue || null,
                        } as any);
                        setEditingNextReview(false);
                        toast({ title: "Próxima revisão atualizada" });
                      }}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setEditingNextReview(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <p className="font-medium flex items-center gap-2">
                    {document.next_review_date ? format(parseISO(document.next_review_date), "dd/MM/yyyy") : "—"}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setNextReviewEditValue(document.next_review_date || "");
                        setEditingNextReview(true);
                      }}
                      title="Editar próxima revisão"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </p>
                )}
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
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="content">
              <FileText className="h-4 w-4 mr-1" /> Conteúdo
            </TabsTrigger>
            <TabsTrigger value="norms">
              <BookMarked className="h-4 w-4 mr-1" /> Normas
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1" /> Histórico
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
            <TabsTrigger value="acknowledgements">
              <BadgeCheck className="h-4 w-4 mr-1" /> Ciência
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
                <CardTitle className="text-base">Ou: anexar arquivo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Aceita PDF, Word, Excel, PowerPoint, imagens e texto. Tamanho máximo: 50&nbsp;MB.
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
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.png,.jpg,.jpeg,.webp"
                    className="opacity-0 absolute inset-0 cursor-pointer"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f && f.size > 50 * 1024 * 1024) {
                        toast({
                          title: "Arquivo muito grande",
                          description: "O tamanho máximo é 50 MB.",
                          variant: "destructive",
                        });
                        e.target.value = "";
                        return;
                      }
                      setUploadFile(f);
                    }}
                  />
                </div>
                <Button onClick={() => createDraftVersion("file")} disabled={!uploadFile || createVersion.isPending}>
                  Salvar como nova versão (rascunho)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="norms">
            <DocumentNormsPanel documentId={document.id} />
          </TabsContent>

          <TabsContent value="history">
            <DocumentHistoryTimeline versions={versions} documentId={document.id} />
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
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(v.file_path!, v.file_name!, v.file_mime)}>
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

          <TabsContent value="acknowledgements" className="space-y-4">
            <DocumentPrerequisitesPanel documentId={document.id} />
            <DocumentAcknowledgementsPanel
              documentId={document.id}
              currentVersionId={document.current_version_id}
              requiresStrong={!!(document as any).requires_strong_acknowledgement}
            />
          </TabsContent>

          <TabsContent value="log">
            <DocumentAccessLogPanel documentId={document.id} />
          </TabsContent>
        </Tabs>

        <Dialog open={showViewer} onOpenChange={setShowViewer}>
          <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {document.code} — Rev {(publishedVersion || activeVersion)?.revision_label}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <PDFCanvasViewer blob={fileBlob} watermarkText={viewerWatermark} />
            </div>
          </DialogContent>
        </Dialog>

        <EditDocumentMetadataDialog open={showEdit} onOpenChange={setShowEdit} document={document} />

        <ShareDocumentDialog
          open={showShare}
          onOpenChange={setShowShare}
          documentId={document.id}
          documentTitle={document.title}
        />

        <AlertDialog open={showObsoleteConfirm} onOpenChange={(o) => { setShowObsoleteConfirm(o); if (!o) setObsoleteReason(""); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Marcar documento como obsoleto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação retira o documento de circulação e marca todas as versões publicadas como obsoletas.
                A ação será registrada no histórico do documento com o motivo informado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <label className="text-sm font-medium">Motivo da obsolescência *</label>
              <Textarea
                value={obsoleteReason}
                onChange={(e) => setObsoleteReason(e.target.value)}
                placeholder="Ex.: substituído pela revisão 3.0, ajuste normativo, processo descontinuado..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres.</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={obsoleteReason.trim().length < 10 || markObsolete.isPending}
                onClick={(e) => {
                  if (obsoleteReason.trim().length < 10) {
                    e.preventDefault();
                    return;
                  }
                  markObsolete.mutate({ reason: obsoleteReason.trim() });
                  setShowObsoleteConfirm(false);
                  setObsoleteReason("");
                }}
              >
                Marcar obsoleto
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={!!pendingOfficeDownload}
          onOpenChange={(o) => { if (!o) setPendingOfficeDownload(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Este arquivo é uma cópia controlada</AlertDialogTitle>
              <AlertDialogDescription>
                Documentos Office (Word, Excel, PowerPoint) não podem receber marca d'água automática no visualizador.
                Ao baixar este arquivo, você é responsável por não alterá-lo, redistribuí-lo ou imprimir cópias sem
                autorização da Coordenação da Qualidade. O download será registrado no log de acesso.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  const p = pendingOfficeDownload;
                  setPendingOfficeDownload(null);
                  if (p) await performDownload(p.path, p.filename);
                }}
              >
                Estou ciente, baixar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default QualityDocumentDetail;
