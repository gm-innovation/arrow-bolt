import { useMemo, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Link2, Trash2, ExternalLink } from "lucide-react";
import { useQualityDocumentPublicLinks } from "@/hooks/useQualityDocumentPublicLinks";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string;
  documentTitle: string;
}

export default function ShareDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: Props) {
  const { links, isLoading, createLink, revokeLink, buildPublicUrl } =
    useQualityDocumentPublicLinks(documentId);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [maxUses, setMaxUses] = useState<string>("50");

  const activeLinks = useMemo(
    () =>
      links.filter(
        (l) => !l.revoked_at && new Date(l.expires_at).getTime() > Date.now(),
      ),
    [links],
  );

  const handleCreate = async () => {
    const parsed = maxUses.trim() === "" ? null : Number(maxUses);
    if (parsed != null && (isNaN(parsed) || parsed <= 0)) {
      toast({
        title: "Limite inválido",
        description: "Informe um número maior que zero ou deixe em branco.",
        variant: "destructive",
      });
      return;
    }
    await createLink.mutateAsync({ expiresInDays, maxUses: parsed });
  };

  const copyUrl = async (token: string) => {
    const url = buildPublicUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "URL copiada" });
    } catch {
      toast({ title: "Copie manualmente", description: url });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Compartilhar documento
          </DialogTitle>
          <DialogDescription>
            Gere links públicos temporários para "{documentTitle}". Pessoas com
            o link podem visualizar o documento sem entrar no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Expira em (dias)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Limite de acessos (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Sem limite"
              />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={createLink.isPending}
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {createLink.isPending ? "Gerando..." : "Gerar novo link público"}
          </Button>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Links ativos</h4>
              <Badge variant="outline">{activeLinks.length}</Badge>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum link gerado ainda.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {links.map((l) => {
                  const url = buildPublicUrl(l.token);
                  const expired =
                    new Date(l.expires_at).getTime() < Date.now();
                  const limitReached =
                    l.max_uses != null && l.access_count >= l.max_uses;
                  const inactive = !!l.revoked_at || expired || limitReached;
                  return (
                    <div
                      key={l.id}
                      className="border rounded-md p-3 space-y-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={url}
                          className="font-mono text-xs h-8"
                          onFocus={(e) => e.currentTarget.select()}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyUrl(l.token)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={inactive ? "secondary" : "default"}>
                          {l.revoked_at
                            ? "Revogado"
                            : expired
                            ? "Expirado"
                            : limitReached
                            ? "Limite atingido"
                            : "Ativo"}
                        </Badge>
                        <span>
                          Expira{" "}
                          {formatDistanceToNow(parseISO(l.expires_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}{" "}
                          ({format(parseISO(l.expires_at), "dd/MM/yyyy HH:mm")})
                        </span>
                        <span>•</span>
                        <span>
                          {l.access_count} acesso(s)
                          {l.max_uses != null ? ` / ${l.max_uses}` : ""}
                        </span>
                        {!inactive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-destructive h-7"
                            onClick={() => revokeLink.mutate(l.id)}
                            disabled={revokeLink.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Revogar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
