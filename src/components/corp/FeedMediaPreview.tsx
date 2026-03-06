import { X, FileText, Download, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Attachment {
  id?: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size?: number | null;
  mime_type?: string | null;
}

interface FeedMediaPreviewProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

const formatSize = (bytes?: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const downloadFile = async (url: string, name: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao baixar');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    toast({ title: 'Erro ao baixar arquivo', variant: 'destructive' });
  }
};

const openImageInNewTab = async (url: string, name: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao abrir');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } catch {
    toast({ title: 'Erro ao abrir imagem', variant: 'destructive' });
  }
};

const FeedMediaPreview = ({ attachments, onRemove, editable }: FeedMediaPreviewProps) => {
  if (!attachments.length) return null;

  const images = attachments.filter(a => a.file_type === 'image');
  const videos = attachments.filter(a => a.file_type === 'video');
  const audios = attachments.filter(a => a.file_type === 'audio');
  const files = attachments.filter(a => a.file_type === 'file');

  const getIndex = (att: Attachment) => attachments.indexOf(att);

  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div className={cn(
          'grid gap-1 rounded-lg overflow-hidden',
          images.length === 1 && 'grid-cols-1',
          images.length === 2 && 'grid-cols-2',
          images.length >= 3 && 'grid-cols-2'
        )}>
          {images.map((img, i) => (
            <div key={i} className={cn(
              'relative group',
              images.length === 3 && i === 0 && 'row-span-2',
              images.length >= 3 && i === 0 && 'row-span-2'
            )}>
              <img
                src={img.file_url}
                alt={img.file_name}
                className="w-full h-full object-cover max-h-80 cursor-pointer"
                onClick={() => openImageInNewTab(img.file_url, img.file_name)}
              />
              {editable && onRemove && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onRemove(getIndex(img))}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {videos.map((vid, i) => (
        <div key={i} className="relative group">
          <video controls className="w-full rounded-lg max-h-80" preload="metadata" crossOrigin="anonymous">
            <source src={vid.file_url} type={vid.mime_type || 'video/mp4'} />
          </video>
          {editable && onRemove && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(getIndex(vid))}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {audios.map((aud, i) => (
        <div key={i} className="relative flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
          <Music className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{aud.file_name}</p>
            <audio controls className="w-full h-8 mt-1" preload="metadata">
              <source src={aud.file_url} type={aud.mime_type || 'audio/mpeg'} />
            </audio>
          </div>
          {editable && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onRemove(getIndex(aud))}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {files.map((file, i) => (
        <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.file_name}</p>
            {file.file_size && <p className="text-[10px] text-muted-foreground">{formatSize(file.file_size)}</p>}
          </div>
          {editable && onRemove ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onRemove(getIndex(file))}>
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => downloadFile(file.file_url, file.file_name)}>
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};

export default FeedMediaPreview;
