import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityRisks from "./Risks";
import QualityInterestedParties from "./InterestedParties";
import OrgContext from "./OrgContext";
import Processes from "./Processes";
import ScenarioSwot from "./ScenarioSwot";
import Planning from "./Planning";

const RisksHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "risks";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="risks">Riscos &amp; Oportunidades</TabsTrigger>
        <TabsTrigger value="planning">Planejamento</TabsTrigger>
        <TabsTrigger value="parties">Partes Interessadas</TabsTrigger>
        <TabsTrigger value="context">Contexto</TabsTrigger>
        <TabsTrigger value="processes">Processos</TabsTrigger>
        <TabsTrigger value="scenario">SWOT / Cenário</TabsTrigger>
      </TabsList>
      <TabsContent value="risks"><QualityRisks /></TabsContent>
      <TabsContent value="planning"><Planning /></TabsContent>
      <TabsContent value="parties"><QualityInterestedParties /></TabsContent>
      <TabsContent value="context"><OrgContext /></TabsContent>
      <TabsContent value="processes"><Processes /></TabsContent>
      <TabsContent value="scenario"><ScenarioSwot /></TabsContent>
    </Tabs>
  );
};

export default RisksHub;
