import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQualityReferenceNorms, type QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  norm?: QualityReferenceNorm | null;
}

const empty = {
  code: "", title: "", issuer: "", revision: "", valid_from: "", valid_until: "",
  next_review_due_at: "", review_frequency_months: 12, notes: "", is_active: true,
  attachment_url: "", attachment_name: "",
};

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

export const NormFormDialog = ({ open, onOpenChange, norm }: Props) => {
  const { create, update } = useQualityReferenceNorms();
  const { profile } = useAuth();
  const [form, setForm] = useState<any>(empty);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (norm) {
      setForm({
        code: norm.code || "", title: norm.title || "", issuer: norm.issuer || "",
        revision: (norm as any).revision || "", valid_from: norm.valid_from || "",
        valid_until: norm.valid_until || "",
        next_review_due_at: (norm as any).next_review_due_at || "",
        review_frequency_months: (norm as any).review_frequency_months ?? 12,
        notes: norm.notes || "", is_active: norm.is_active ?? true,
        attachment_url: (norm as any).attachment_url || "",
        attachment_name: (norm as any).attachment_name || "",
      });
    } else setForm(empty);
  }, [norm, open]);

  const handleUpload = async (file: File) => {
    if (!profile?.company_id) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Limite de 50MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const path = `${profile.company_id}/${norm?.id ?? "new"}/${Date.now()}_${sanitize(file.name)}`;
      const { error } = await supabase.storage.from("quality-norms").upload(path, file, { upsert: false });
      if (error) throw error;
      setForm((f: any) => ({ ...f, attachment_url: path, attachment_name: file.name }));
      toast({ title: "Arquivo anexado" });
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAttachment = async () => {
    if (form.attachment_url) {
      await supabase.storage.from("quality-norms").remove([form.attachment_url]);
    }
    setForm((f: any) => ({ ...f, attachment_url: "", attachment_name: "" }));
  };

  const save = async () => {
    const payload: any = {
      ...form,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      next_review_due_at: form.next_review_due_at || null,
      issuer: form.issuer || null,
      revision: form.revision || null,
      notes: form.notes || null,
      attachment_url: form.attachment_url || null,
      attachment_name: form.attachment_name || null,
    };
    if (norm) await update.mutateAsync({ id: norm.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{norm ? "Editar Norma" : "Nova Norma de Referência"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ISO 9001:2015" /></div>
          <div className="space-y-1"><Label>Emissor</Label><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="ABNT, ISO, ANP..." /></div>
          <div className="space-y-1 col-span-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="space-y-1"><Label>Revisão</Label><Input value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} placeholder="Ed. 2015" /></div>
          <div className="space-y-1"><Label>Periodicidade revisão (meses)</Label><Input type="number" value={form.review_frequency_months} onChange={(e) => setForm({ ...form, review_frequency_months: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label>Válida desde</Label><Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
          <div className="space-y-1"><Label>Válida até</Label><Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
          <div className="space-y-1 col-span-2"><Label>Próxima revisão</Label><Input type="date" value={form.next_review_due_at} onChange={(e) => setForm({ ...form, next_review_due_at: e.target.value })} /></div>

          <div className="space-y-1 col-span-2">
            <Label>Arquivo da norma (PDF, Word, até 50MB)</Label>
            {form.attachment_url ? (
              <div className="flex items-center gap-2 border rounded-md p-2 bg-muted/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm flex-1 truncate">{form.attachment_name}</span>
                <Button type="button" variant="ghost" size="icon" onClick={removeAttachment}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Button type="button" variant="outline" disabled={uploading} className="w-full">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploading ? "Enviando..." : "Selecionar arquivo"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  className="opacity-0 absolute inset-0 cursor-pointer"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-center gap-2 col-span-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!form.code || !form.title || uploading}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NormFormDialog;
