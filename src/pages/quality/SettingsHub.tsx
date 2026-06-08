import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualitySettings from "./Settings";
import QualityIsoStructure from "./IsoStructure";
import CentralApproval from "./CentralApproval";
import LayoutGlobal from "./LayoutGlobal";
import ITBackup from "./ITBackup";
import QualityPolicy from "./QualityPolicy";

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
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="params">Parâmetros SGQ</TabsTrigger>
        <TabsTrigger value="iso">Estrutura ISO</TabsTrigger>
        <TabsTrigger value="layout">Layout global</TabsTrigger>
        <TabsTrigger value="approval">Aprovação central / workflow</TabsTrigger>
        <TabsTrigger value="it">TI &amp; Backup</TabsTrigger>
        <TabsTrigger value="policy">Política da Qualidade</TabsTrigger>
      </TabsList>
      <TabsContent value="params"><QualitySettings /></TabsContent>
      <TabsContent value="iso"><QualityIsoStructure /></TabsContent>
      <TabsContent value="layout"><LayoutGlobal /></TabsContent>
      <TabsContent value="approval"><CentralApproval /></TabsContent>
      <TabsContent value="it"><ITBackup /></TabsContent>
      <TabsContent value="policy"><QualityPolicy /></TabsContent>
    </Tabs>
  );
};

export default SettingsHub;
