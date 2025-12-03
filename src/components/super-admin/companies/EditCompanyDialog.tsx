import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Company } from "@/hooks/useCompanies";
import { CompanyForm } from "./CompanyForm";
import { WhatsAppCompanySettings } from "./WhatsAppCompanySettings";
import { AIAnalyticsTab } from "./AIAnalyticsTab";
import { Building2, MessageSquare, Bot } from "lucide-react";

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

export const EditCompanyDialog = ({ open, onOpenChange, company }: EditCompanyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Empresa - {company.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Dados</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics IA</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="dados" className="mt-0">
              <CompanyForm company={company} onSuccess={() => onOpenChange(false)} />
            </TabsContent>

            <TabsContent value="whatsapp" className="mt-0">
              <WhatsAppCompanySettings companyId={company.id} />
            </TabsContent>

            <TabsContent value="ai" className="mt-0">
              <AIAnalyticsTab companyId={company.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
