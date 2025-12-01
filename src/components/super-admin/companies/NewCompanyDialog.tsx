import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CompanyForm } from "./CompanyForm";

interface NewCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewCompanyDialog = ({ open, onOpenChange }: NewCompanyDialogProps) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>

        <CompanyForm onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};
