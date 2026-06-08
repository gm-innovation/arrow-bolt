import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityRisks from "./Risks";
import QualityInterestedParties from "./InterestedParties";
import OrgContext from "./OrgContext";

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
      <TabsList>
        <TabsTrigger value="risks">Riscos & Oportunidades</TabsTrigger>
        <TabsTrigger value="parties">Partes Interessadas</TabsTrigger>
        <TabsTrigger value="context">Contexto</TabsTrigger>
      </TabsList>
      <TabsContent value="risks"><QualityRisks /></TabsContent>
      <TabsContent value="parties"><QualityInterestedParties /></TabsContent>
      <TabsContent value="context"><OrgContext /></TabsContent>
    </Tabs>
  );
};

export default RisksHub;
