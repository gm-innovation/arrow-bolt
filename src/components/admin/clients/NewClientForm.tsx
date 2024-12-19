import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyInfoForm } from "./CompanyInfoForm";
import { ContactsForm } from "./ContactsForm";
import { VesselsForm } from "./VesselsForm";

export const NewClientForm = () => {
  return (
    <Tabs defaultValue="company" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="company">Informações da Empresa</TabsTrigger>
        <TabsTrigger value="contacts">Contatos</TabsTrigger>
        <TabsTrigger value="vessels">Embarcações</TabsTrigger>
      </TabsList>
      <TabsContent value="company">
        <CompanyInfoForm />
      </TabsContent>
      <TabsContent value="contacts">
        <ContactsForm />
      </TabsContent>
      <TabsContent value="vessels">
        <VesselsForm />
      </TabsContent>
    </Tabs>
  );
};