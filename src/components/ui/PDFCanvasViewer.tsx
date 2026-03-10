import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from './scroll-area';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PDFCanvasViewerProps {
  blob: Blob | null;
  className?: string;
}

export const PDFCanvasViewer = ({ blob, className }: PDFCanvasViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || !containerRef.current) return;

    let cancelled = false;

    const renderPDF = async () => {
      setIsRendering(true);
      setError(null);

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        if (cancelled || !containerRef.current) return;

        // Clear previous canvases
        containerRef.current.innerHTML = '';

        for (let i = 1; i <= pdfDoc.numPages; i++) {
          if (cancelled) return;

          const page = await pdfDoc.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          if (i < pdfDoc.numPages) {
            canvas.style.marginBottom = '8px';
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

          if (!cancelled && containerRef.current) {
            containerRef.current.appendChild(canvas);
          }
        }
      } catch (err) {
        console.error('Error rendering PDF:', err);
        if (!cancelled) {
          setError('Não foi possível renderizar o PDF.');
        }
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    };

    renderPDF();

    return () => {
      cancelled = true;
    };
  }, [blob]);

  if (!blob) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <p className="text-sm text-muted-foreground">Nenhum PDF disponível</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <ScrollArea className={`h-full w-full ${className || ''}`}>
      {isRendering && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={containerRef} className="p-2 bg-muted/30" />
    </ScrollArea>
  );
};
