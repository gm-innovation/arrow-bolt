import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualitySettings from "./Settings";
import QualityIsoStructure from "./IsoStructure";
import CentralApproval from "./CentralApproval";

const SettingsHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "params";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="params">Parâmetros SGQ</TabsTrigger>
        <TabsTrigger value="iso">Estrutura ISO</TabsTrigger>
        <TabsTrigger value="approval">Aprovação central / workflow</TabsTrigger>
      </TabsList>
      <TabsContent value="params"><QualitySettings /></TabsContent>
      <TabsContent value="iso"><QualityIsoStructure /></TabsContent>
      <TabsContent value="approval"><CentralApproval /></TabsContent>
    </Tabs>
  );
};

export default SettingsHub;
