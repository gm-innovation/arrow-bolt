import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Company } from "@/hooks/useCompanies";
import { CompanyForm } from "./CompanyForm";

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

export const EditCompanyDialog = ({ open, onOpenChange, company }: EditCompanyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
        </DialogHeader>

        <CompanyForm company={company} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};
