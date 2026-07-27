import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, FileSpreadsheet, FileType, File as FileIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MarinaAttachment =
  | { kind: 'image'; name: string; mime: string; size: number; dataUrl: string }
  | { kind: 'file'; name: string; mime: string; size: number; path: string };

interface Props {
  attachments: MarinaAttachment[];
  onChange: (next: MarinaAttachment[]) => void;
  max?: number;
}

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPT =
  'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv';

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.includes('pdf')) return FileType;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('word') || mime.includes('presentation') || mime.startsWith('text/')) return FileText;
  return FileIcon;
}

function sanitize(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1200;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = (height / width) * maxSize; width = maxSize; }
          else { width = (width / height) * maxSize; height = maxSize; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AIAttachmentUpload({ attachments, onChange, max = 3 }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length || !user?.id) return;
    if (attachments.length + files.length > max) {
      toast.error(`Máximo de ${max} anexos por mensagem`);
      return;
    }
    setUploading(true);
    try {
      const next: MarinaAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: acima de 20MB`);
          continue;
        }
        if (file.type.startsWith('image/')) {
          const dataUrl = await compressImage(file);
          next.push({ kind: 'image', name: file.name, mime: file.type, size: file.size, dataUrl });
        } else {
          const safe = sanitize(file.name);
          const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
          const { error } = await supabase.storage
            .from('marina-attachments')
            .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
          if (error) {
            toast.error(`Falha ao enviar ${file.name}: ${error.message}`);
            continue;
          }
          next.push({ kind: 'file', name: file.name, mime: file.type || 'application/octet-stream', size: file.size, path });
        }
      }
      if (next.length) onChange([...attachments, ...next]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (idx: number) => {
    const item = attachments[idx];
    if (item?.kind === 'file') {
      supabase.storage.from('marina-attachments').remove([item.path]).catch(() => {});
    }
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => {
            const Icon = iconFor(a.mime);
            return (
              <div key={i} className="relative flex items-center gap-2 rounded border border-border bg-muted/40 pl-2 pr-6 py-1 text-xs max-w-[220px]">
                {a.kind === 'image' ? (
                  <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{a.name}</span>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-destructive/20"
                  aria-label={`Remover ${a.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || attachments.length >= max}
        title="Anexar arquivo (imagem, PDF, Word, Excel, PPT, TXT, CSV — até 20MB)"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
    </div>
  );
}
