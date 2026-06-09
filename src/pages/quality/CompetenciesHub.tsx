import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityMyCompetencies from "./MyCompetencies";
import QualityMyAcknowledgements from "./MyAcknowledgements";
import OrgChart from "./OrgChart";

const CompetenciesHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "org";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="org">Estrutura / Responsabilidades</TabsTrigger>
        <TabsTrigger value="me">Meu Desenvolvimento</TabsTrigger>
        <TabsTrigger value="acknowledgements">Minha Ciência</TabsTrigger>
      </TabsList>
      <TabsContent value="org"><OrgChart /></TabsContent>
      <TabsContent value="me"><QualityMyCompetencies /></TabsContent>
      <TabsContent value="acknowledgements"><QualityMyAcknowledgements /></TabsContent>
    </Tabs>
  );
};

export default CompetenciesHub;
