import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentUploadZoneProps {
  onFileSelect: (file: File) => Promise<void>;
  isProcessing: boolean;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
}

export const DocumentUploadZone = ({
  onFileSelect,
  isProcessing,
  acceptedFileTypes = '.pdf',
  maxSizeMB = 20
}: DocumentUploadZoneProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
        return;
      }
      setSelectedFile(file);
      setUploadStatus('processing');
      await onFileSelect(file);
      setUploadStatus('success');
    }
  }, [onFileSelect, maxSizeMB]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`Arquivo muito grande. Máximo: ${maxSizeMB}MB`);
        return;
      }
      setSelectedFile(file);
      setUploadStatus('processing');
      await onFileSelect(file);
      setUploadStatus('success');
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
      >
        <input
          type="file"
          accept={acceptedFileTypes}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            Arraste o ASO aqui ou clique para selecionar
          </p>
          <p className="text-sm text-muted-foreground">
            PDF até {maxSizeMB}MB • Dados serão extraídos automaticamente
          </p>
        </label>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          {uploadStatus === 'processing' && (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          {uploadStatus === 'success' && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {uploadStatus === 'idle' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
