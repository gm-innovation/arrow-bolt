import { useRef, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface SignaturePadProps {
  onEnd?: () => void;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onEnd, className }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clear: () => sigCanvas.current?.clear(),
      isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
      toDataURL: () => sigCanvas.current?.toDataURL("image/png") ?? "",
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
      onEnd?.();
    };

    return (
      <div className={className}>
        <div className="border-2 border-dashed border-border rounded-lg bg-background">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: "w-full h-40 rounded-lg",
              style: { width: "100%", height: "160px" },
            }}
            penColor="hsl(var(--foreground))"
            onEnd={onEnd}
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
          >
            <Eraser className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
