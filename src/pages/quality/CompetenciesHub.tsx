import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityCompetencyMatrix from "./CompetencyMatrix";
import QualityMyCompetencies from "./MyCompetencies";
import QualityMyAcknowledgements from "./MyAcknowledgements";
import OrgChart from "./OrgChart";

const CompetenciesHub = () => {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const tab = sp.get("tab") || "matrix";
  const onChange = (v: string) => {
    if (v === "training") {
      navigate("/corp/university");
      return;
    }
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <Tabs value={tab} onValueChange={onChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="matrix">Matriz de Competência</TabsTrigger>
        <TabsTrigger value="me">Meu Desenvolvimento</TabsTrigger>
        <TabsTrigger value="acknowledgements">Minha Ciência</TabsTrigger>
        <TabsTrigger value="training">Treinamentos</TabsTrigger>
        <TabsTrigger value="org">Estrutura / Responsabilidades</TabsTrigger>
      </TabsList>
      <TabsContent value="matrix"><QualityCompetencyMatrix /></TabsContent>
      <TabsContent value="me"><QualityMyCompetencies /></TabsContent>
      <TabsContent value="acknowledgements"><QualityMyAcknowledgements /></TabsContent>
      <TabsContent value="org"><OrgChart /></TabsContent>
    </Tabs>
  );
};

export default CompetenciesHub;
