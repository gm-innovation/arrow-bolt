import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, FileText, FileSpreadsheet, FileType, File as FileIcon, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMarinaAttachments } from '@/hooks/useMarinaAttachments';

export type MarinaAttachment =
  | { kind: 'image'; name: string; mime: string; size: number; dataUrl: string }
  | { kind: 'file'; name: string; mime: string; size: number; path: string };

interface Props {
  attachments: MarinaAttachment[];
  onChange: (next: MarinaAttachment[]) => void;
  max?: number;
}

const ACCEPT =
  'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv';

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.includes('pdf')) return FileType;
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet;
  if (mime.includes('word') || mime.includes('presentation') || mime.startsWith('text/')) return FileText;
  return FileIcon;
}

export function AIAttachmentUpload({ attachments, onChange, max = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { processFiles, uploading } = useMarinaAttachments(attachments, onChange, max);

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
        onChange={async (e) => {
          await processFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = '';
        }}
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
        title={`Anexar arquivos (até ${max}, imagem/PDF/Word/Excel/PPT/TXT/CSV — 20MB cada). Você também pode arrastar e soltar.`}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
    </div>
  );
}
