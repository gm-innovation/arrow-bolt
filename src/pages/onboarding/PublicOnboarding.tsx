import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Clock, Upload, FileText } from "lucide-react";
import { usePublicOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

const statusLabel: Record<string, string> = {
  pending: "Pendente de revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const PublicOnboarding = () => {
  const { token } = useParams<{ token: string }>();
  const { onboarding, docTypes, documents, companyLogoUrl, isLoading, error, uploadDocument } = usePublicOnboarding(token);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-48 mb-8" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !onboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Link inválido ou expirado</h2>
            <p className="text-sm text-muted-foreground">
              Este link de admissão não é válido. Entre em contato com o RH para obter um novo link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submittedTypeIds = documents.map((d: any) => d.document_type_id);

  const getDocumentForType = (typeId: string) => documents.find((d: any) => d.document_type_id === typeId);

  const handleUploadClick = (typeId: string) => {
    setSelectedTypeId(typeId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTypeId || !onboarding) return;

    setUploadingType(selectedTypeId);
    try {
      const sanitized = sanitizeFileName(file.name);
      const path = `onboarding/${onboarding.id}/${selectedTypeId}/${Date.now()}-${sanitized}`;

      const { error: uploadError } = await supabase.storage.from("corp-documents").upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("corp-documents").getPublicUrl(path);

      await uploadDocument.mutateAsync({
        onboarding_id: onboarding.id,
        document_type_id: selectedTypeId,
        file_name: file.name,
        file_url: urlData.publicUrl,
      });

      toast({ title: "Documento enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar documento", description: err.message, variant: "destructive" });
    } finally {
      setUploadingType(null);
      setSelectedTypeId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center w-full max-w-2xl">
        {companyLogoUrl && (
          <img
            src={companyLogoUrl}
            alt="Logo da empresa"
            className="h-64 max-w-lg object-contain mb-8"
          />
        )}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Bem-vindo(a), {onboarding.candidate_name}!</CardTitle>
          <p className="text-sm text-muted-foreground">
            Envie os documentos abaixo para dar prosseguimento ao seu processo de admissão.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />

          {docTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum documento configurado ainda. Aguarde instruções do RH.
            </p>
          ) : (
            <div className="space-y-3">
              {docTypes.map((dt: any) => {
                const doc = getDocumentForType(dt.id);
                const isUploading = uploadingType === dt.id;

                return (
                  <div
                    key={dt.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{dt.name}</span>
                        {dt.is_required && (
                          <Badge variant="secondary" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      {dt.description && <p className="text-xs text-muted-foreground mt-1">{dt.description}</p>}
                      {doc && (
                        <div className="flex items-center gap-1 mt-2">
                          {statusIcon[doc.status]}
                          <span className="text-xs">{statusLabel[doc.status]}</span>
                          {doc.rejection_reason && (
                            <span className="text-xs text-destructive ml-2">— {doc.rejection_reason}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="ml-4">
                      {!doc || doc.status === "rejected" ? (
                        <Button
                          size="sm"
                          variant={doc?.status === "rejected" ? "destructive" : "default"}
                          onClick={() => handleUploadClick(dt.id)}
                          disabled={isUploading}
                          className="gap-1"
                        >
                          <Upload className="h-3 w-3" />
                          {isUploading ? "Enviando..." : doc?.status === "rejected" ? "Reenviar" : "Enviar"}
                        </Button>
                      ) : (
                        <Badge variant={doc.status === "approved" ? "outline" : "secondary"}>
                          {doc.status === "approved" ? "Aprovado ✓" : "Enviado"}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              {documents.length} de {docTypes.length} documentos enviados
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default PublicOnboarding;
