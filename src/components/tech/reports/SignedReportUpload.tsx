import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileCheck, X, Loader2, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignedReportUploadProps {
  reportId: string;
  signedPdfPath: string | null;
  orderNumber?: string;
  vesselName?: string;
  onUploadComplete?: (path: string) => void;
  readOnly?: boolean;
}

export function SignedReportUpload({
  reportId,
  signedPdfPath,
  orderNumber,
  vesselName,
  onUploadComplete,
  readOnly = false
}: SignedReportUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState(signedPdfPath);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato inválido",
        description: "Envie um arquivo PDF ou imagem (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Generate file name
      const fileExt = file.name.split('.').pop();
      const fileName = `signed/${reportId}/relatorio-assinado.${fileExt}`;

      // Delete old file if exists
      if (currentPath) {
        await supabase.storage.from('reports').remove([currentPath]);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update database
      const { error: updateError } = await supabase
        .from('task_reports')
        .update({ signed_pdf_path: fileName })
        .eq('id', reportId);

      if (updateError) throw updateError;

      setCurrentPath(fileName);
      onUploadComplete?.(fileName);

      toast({
        title: "Upload concluído",
        description: "O relatório assinado foi arquivado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!currentPath) return;

    try {
      setUploading(true);

      // Remove file from storage
      await supabase.storage.from('reports').remove([currentPath]);

      // Update database
      await supabase
        .from('task_reports')
        .update({ signed_pdf_path: null })
        .eq('id', reportId);

      setCurrentPath(null);

      toast({
        title: "Arquivo removido",
        description: "O relatório assinado foi removido.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleView = async () => {
    if (!currentPath) return;

    try {
      const { data } = await supabase.storage
        .from('reports')
        .createSignedUrl(currentPath, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Erro ao abrir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    if (!currentPath) return;

    try {
      const { data } = await supabase.storage
        .from('reports')
        .createSignedUrl(currentPath, 3600);

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = `Relatório Assinado - OS${orderNumber || 'N-A'} - ${vesselName || 'Embarcação'}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao baixar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          Relatório Assinado
        </CardTitle>
        <CardDescription>
          {currentPath 
            ? "Relatório assinado arquivado" 
            : "Envie o relatório com a assinatura do comandante"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentPath ? (
          <div className="flex items-center justify-between gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <FileCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Relatório assinado disponível</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleView}
                title="Visualizar"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                title="Baixar"
              >
                <Download className="h-4 w-4" />
              </Button>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemove}
                  disabled={uploading}
                  title="Remover"
                  className="text-destructive hover:text-destructive"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        ) : (
          !readOnly && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
                id={`signed-upload-${reportId}`}
              />
              <label htmlFor={`signed-upload-${reportId}`}>
                <Button
                  variant="outline"
                  className="w-full cursor-pointer"
                  disabled={uploading}
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploading ? "Enviando..." : "Enviar Relatório Assinado"}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground text-center">
                Formatos aceitos: PDF, JPG, PNG, WebP (máx. 10MB)
              </p>
            </div>
          )
        )}
        {!currentPath && readOnly && (
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <span className="text-sm text-muted-foreground">Nenhum relatório assinado enviado</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
