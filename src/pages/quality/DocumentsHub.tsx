import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityDocuments from "./Documents";
import QualityControlledCopies from "./ControlledCopies";
import CompanyDocuments from "./CompanyDocuments";
import MasterList from "./MasterList";

const DocumentsHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "documents";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="documents">Documentos</TabsTrigger>
        <TabsTrigger value="copies">Cópias Controladas</TabsTrigger>
        <TabsTrigger value="master">Lista Mestre</TabsTrigger>
        <TabsTrigger value="company">Documentos da Empresa</TabsTrigger>
      </TabsList>
      <TabsContent value="documents"><QualityDocuments /></TabsContent>
      <TabsContent value="copies"><QualityControlledCopies /></TabsContent>
      <TabsContent value="master"><MasterList /></TabsContent>
      <TabsContent value="company"><CompanyDocuments /></TabsContent>
    </Tabs>
  );
};

export default DocumentsHub;
