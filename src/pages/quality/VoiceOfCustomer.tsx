import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MessagesSquare, Smile, MessageSquareWarning, Lightbulb, TrendingUp } from "lucide-react";
import { useSatisfactionCampaigns } from "@/hooks/useSatisfactionCampaigns";
import { useQualityComplaints } from "@/hooks/useQualityComplaints";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import OverviewTab from "@/components/quality/voc/OverviewTab";
import CampaignsTab from "@/components/quality/voc/CampaignsTab";
import ComplaintsTab from "@/components/quality/voc/ComplaintsTab";
import SuggestionsTab from "@/components/quality/voc/SuggestionsTab";

interface KpiProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "good" | "warn";
}
const Kpi = ({ label, value, hint, icon: Icon, tone = "default" }: KpiProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              tone === "good" ? "text-green-600" : tone === "warn" ? "text-amber-600" : ""
            }`}
          >
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </CardContent>
  </Card>
);

export default function VoiceOfCustomer() {
  const [tab, setTab] = useState("overview");
  const { campaigns } = useSatisfactionCampaigns();
  const { complaints: allComplaints } = useQualityComplaints();
  const { profile } = useAuth();

  const { data: allResponses = [] } = useQuery({
    queryKey: ["voc_all_responses", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_satisfaction_responses" as any)
        .select("nps_score,csat_score,derived_nps,derived_csat,responded_at,comment")
        .eq("company_id", profile!.company_id)
        .order("responded_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const kpis = useMemo(() => {
    const npsAvg = allResponses.length
      ? allResponses.reduce((s, r) => s + r.nps_score, 0) / allResponses.length
      : null;
    const csatAvg = allResponses.length
      ? allResponses.reduce((s, r) => s + r.csat_score, 0) / allResponses.length
      : null;
    const complaints = allComplaints.filter((c) => c.kind === "complaint");
    const openComplaints = complaints.filter(
      (c) => c.status !== "resolved" && c.status !== "rejected"
    ).length;

    let totalInvites = 0;
    let totalResponses = 0;
    campaigns.forEach((c) => {
      totalInvites += c.invites_count ?? 0;
      totalResponses += c.responses_count ?? 0;
    });
    const respRate = totalInvites > 0 ? Math.round((totalResponses / totalInvites) * 100) : null;

    return {
      npsAvg,
      csatAvg,
      openComplaints,
      respRate,
      totalResponses,
    };
  }, [allResponses, allComplaints, campaigns]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessagesSquare className="h-6 w-6 text-primary" />
          Voz do Cliente
        </h1>
        <p className="text-sm text-muted-foreground">
          Central de satisfação, reclamações e sugestões (ISO 9001 §9.1.2).
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="NPS médio"
          value={kpis.npsAvg != null ? kpis.npsAvg.toFixed(1) : "—"}
          hint={`${kpis.totalResponses} respostas`}
          icon={TrendingUp}
          tone={kpis.npsAvg != null && kpis.npsAvg >= 7 ? "good" : "default"}
        />
        <Kpi
          label="CSAT médio"
          value={kpis.csatAvg != null ? `${kpis.csatAvg.toFixed(2)} / 5` : "—"}
          icon={Smile}
          tone={kpis.csatAvg != null && kpis.csatAvg >= 4 ? "good" : "default"}
        />
        <Kpi
          label="Reclamações abertas"
          value={String(kpis.openComplaints)}
          icon={MessageSquareWarning}
          tone={kpis.openComplaints > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Taxa de resposta"
          value={kpis.respRate != null ? `${kpis.respRate}%` : "—"}
          hint="Convites respondidos"
          icon={Lightbulb}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="complaints">Reclamações</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            responses={allResponses}
            complaints={allComplaints.filter((c) => c.kind === "complaint")}
            onNavigate={setTab}
          />
        </TabsContent>
        <TabsContent value="campaigns" className="mt-4">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="complaints" className="mt-4">
          <ComplaintsTab />
        </TabsContent>
        <TabsContent value="suggestions" className="mt-4">
          <SuggestionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
