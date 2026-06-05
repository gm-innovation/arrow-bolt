import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityNCRs from "./NCRs";
import QualityImprovements from "./Improvements";
import QualityActionPlans from "./ActionPlans";

const NCRsHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "ncrs";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="ncrs">Não-Conformidades</TabsTrigger>
        <TabsTrigger value="improvements">Melhorias</TabsTrigger>
        <TabsTrigger value="action-plans">Planos de Ação</TabsTrigger>
      </TabsList>
      <TabsContent value="ncrs"><QualityNCRs /></TabsContent>
      <TabsContent value="improvements"><QualityImprovements /></TabsContent>
      <TabsContent value="action-plans"><QualityActionPlans /></TabsContent>
    </Tabs>
  );
};

export default NCRsHub;
