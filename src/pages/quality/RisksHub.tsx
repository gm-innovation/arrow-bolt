import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import QualityRisks from "./Risks";
import QualityInterestedParties from "./InterestedParties";

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
      <TabsContent value="context">
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Contexto da Organização (ISO 9001 — 4.1)</p>
            <p>Documente aqui as questões internas e externas relevantes ao SGQ.</p>
            <p className="text-xs">Em breve: editor estruturado por categoria (SWOT, PESTAL, Stakeholders).</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default RisksHub;
