import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQualitySignature } from "@/hooks/useQualitySignature";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, PenLine, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MySignature = () => {
  const { signature, isLoading, upload, getSignedUrl } = useQualitySignature();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!signature) return;
    const url = await getSignedUrl(signature.signature_image_path);
    setPreviewUrl(url);
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="h-6 w-6" /> Minha Assinatura Eletrônica
        </h2>
        <p className="text-muted-foreground">
          Sua assinatura é usada nos documentos da Qualidade quando você aprova, dá ciência, revisa ou encerra um registro.
          Cada uso fica registrado com data, hora e versão do documento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura atual</CardTitle>
          <CardDescription>
            Recomendado: imagem PNG com fundo transparente, traçado escuro, aproximadamente 400×120 px.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signature ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Assinatura cadastrada em {new Date(signature.created_at).toLocaleDateString("pt-BR")}.
                Para visualizar, clique em "Pré-visualizar".
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                Você ainda não possui uma assinatura cadastrada. Envie uma imagem para começar a assinar documentos.
              </AlertDescription>
            </Alert>
          )}

          {previewUrl && (
            <div className="border rounded-md p-4 bg-white">
              <img src={previewUrl} alt="Assinatura" className="max-h-32 mx-auto" />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Button variant="default" disabled={upload.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                {signature ? "Substituir assinatura" : "Enviar assinatura"}
              </Button>
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="opacity-0 absolute inset-0 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
            </div>
            {signature && (
              <Button variant="outline" onClick={loadPreview}>
                Pré-visualizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MySignature;
