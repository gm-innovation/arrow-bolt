import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInfoForm } from "./CompanyInfoForm";
import { VesselsForm } from "./VesselsForm";
import { Button } from "@/components/ui/button";

interface NewClientFormProps {
  clientData?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
    vessels?: Array<{
      id: string;
      name: string;
      vessel_type: string | null;
    }>;
  };
  onSuccess?: () => void;
}

export const NewClientForm = ({ clientData, onSuccess }: NewClientFormProps) => {
  const [activeTab, setActiveTab] = useState("company");
  const [clientId, setClientId] = useState<string | null>(clientData?.id || null);

  const handleCompanySuccess = (id: string) => {
    setClientId(id);
    setActiveTab("vessels");
  };

  const handleVesselsSuccess = () => {
    onSuccess?.();
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="company">Informações da Empresa</TabsTrigger>
          <TabsTrigger value="vessels" disabled={!clientId && !clientData}>
            Embarcações
          </TabsTrigger>
        </TabsList>
        <TabsContent value="company">
          <CompanyInfoForm 
            clientData={clientData} 
            onSuccess={handleCompanySuccess}
          />
        </TabsContent>
        <TabsContent value="vessels">
          {(clientId || clientData?.id) && (
            <VesselsForm 
              clientId={clientId || clientData!.id}
              vessels={clientData?.vessels}
              onSuccess={handleVesselsSuccess}
            />
          )}
        </TabsContent>
      </Tabs>
      
      {clientData && (
        <div className="flex justify-end pt-4">
          <Button onClick={onSuccess}>Concluir</Button>
        </div>
      )}
    </div>
  );
};