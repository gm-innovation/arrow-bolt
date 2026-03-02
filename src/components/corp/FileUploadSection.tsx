import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Paperclip, X, FileText, Image } from 'lucide-react';

interface FileUploadSectionProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (file: File) => {
  if (file.type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-orange-500" />;
};

const FileUploadSection = ({
  files,
  onFilesChange,
  label = 'Anexos (opcional)',
  accept = 'image/*,.pdf,.doc,.docx',
  multiple = true,
  maxSizeMB = 10,
}: FileUploadSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => f.size <= maxSizeMB * 1024 * 1024);
    onFilesChange([...files, ...valid]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (idx: number) => {
    onFilesChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-3 w-3" /> Anexar
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleAddFiles}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm"
            >
              {getFileIcon(file)}
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-muted-foreground text-xs">{formatFileSize(file.size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => handleRemove(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadSection;
