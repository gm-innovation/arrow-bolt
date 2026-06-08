import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QualityDashboard from "./Dashboard";
import QualityReports from "./Reports";
import PolicyAwarenessBanner from "@/components/quality/PolicyAwarenessBanner";

const DashboardHub = () => {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const onChange = (v: string) => {
    const next = new URLSearchParams(sp);
    next.set("tab", v);
    setSp(next, { replace: true });
  };
  return (
    <div className="space-y-4">
      <PolicyAwarenessBanner />
      <Tabs value={tab} onValueChange={onChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><QualityDashboard /></TabsContent>
        <TabsContent value="reports"><QualityReports /></TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardHub;
