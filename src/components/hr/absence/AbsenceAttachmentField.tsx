import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paperclip, FileText, X, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeFileName } from '@/lib/utils';

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

interface Props {
  companyId: string;
  technicianId: string;
  value: { url: string | null; name: string | null };
  onChange: (v: { url: string | null; name: string | null }) => void;
  disabled?: boolean;
  required?: boolean;
}

export const AbsenceAttachmentField = ({
  companyId,
  technicianId,
  value,
  onChange,
  disabled,
  required,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const canDownload = !!value.url;

  const handleDownload = async () => {
    if (!value.url) return;
    const { data, error } = await supabase.storage
      .from('absence-attachments')
      .createSignedUrl(value.url, 60 * 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erro ao baixar', description: error?.message, variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo: 10MB', variant: 'destructive' });
      return;
    }
    if (!companyId || !technicianId) {
      toast({ title: 'Selecione um técnico antes de anexar', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `${companyId}/${technicianId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from('absence-attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw error;
      onChange({ url: path, name: file.name });
      toast({ title: 'Atestado anexado' });
    } catch (e: any) {
      toast({ title: 'Erro ao anexar', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (value.url) {
      // Remove the storage object; ignore errors silently to avoid blocking form.
      await supabase.storage.from('absence-attachments').remove([value.url]).catch(() => null);
    }
    onChange({ url: null, name: null });
  };

  return (
    <div className="space-y-2">
      <Label>
        Anexo do atestado
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {value.url ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate flex-1" title={value.name || value.url}>
            {value.name || 'Arquivo anexado'}
          </span>
          {canDownload && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 px-2"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="h-7 px-2 text-destructive hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Paperclip className="h-4 w-4 mr-2" /> Selecionar arquivo (PDF, JPG, PNG · até 10MB)
              </>
            )}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="opacity-0 absolute inset-0 cursor-pointer"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Anexe o atestado médico em PDF ou imagem. O arquivo é privado e visível apenas para RH, gestores e o próprio colaborador.
      </p>
    </div>
  );
};

export default AbsenceAttachmentField;
