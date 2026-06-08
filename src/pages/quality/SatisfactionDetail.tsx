import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Copy, Plus } from "lucide-react";
import { useCampaignDetail, useSatisfactionCampaigns, CampaignStatus } from "@/hooks/useSatisfactionCampaigns";
import { toast } from "@/hooks/use-toast";

const npsBadge = (d?: string | null) => {
  if (d === "promoter") return <Badge className="bg-green-600 hover:bg-green-700">Promotor</Badge>;
  if (d === "neutral") return <Badge variant="secondary">Neutro</Badge>;
  if (d === "detractor") return <Badge variant="destructive">Detrator</Badge>;
  return <Badge variant="outline">—</Badge>;
};

const csatBadge = (d?: string | null) => {
  if (d === "satisfied") return <Badge className="bg-green-600 hover:bg-green-700">Satisfeito</Badge>;
  if (d === "neutral") return <Badge variant="secondary">Neutro</Badge>;
  if (d === "dissatisfied") return <Badge variant="destructive">Insatisfeito</Badge>;
  return <Badge variant="outline">—</Badge>;
};

export default function SatisfactionDetail() {
  const { id } = useParams<{ id: string }>();
  const { campaign, invites, responses, createInvite, loadingCampaign } = useCampaignDetail(id);
  const { setStatus } = useSatisfactionCampaigns();

  if (loadingCampaign) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!campaign) return <p className="text-sm text-muted-foreground">Campanha não encontrada.</p>;

  const publicUrl = (token: string) => `${window.location.origin}/satisfaction/r/${token}`;
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(publicUrl(token));
    toast({ title: "Link copiado" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3 h-8">
            <Link to="/quality/satisfaction">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{campaign.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={campaign.status}
            onValueChange={(v) => setStatus.mutate({ id: campaign.id, status: v as CampaignStatus })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="closed">Encerrada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => createInvite.mutate({})} disabled={createInvite.isPending}>
            <Plus className="h-4 w-4 mr-2" /> Gerar convite
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Convites</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{invites.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Respostas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{responses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de resposta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {invites.length ? Math.round((responses.length / invites.length) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">Convites</TabsTrigger>
          <TabsTrigger value="responses">Respostas</TabsTrigger>
        </TabsList>

        <TabsContent value="invites">
          <Card>
            <CardContent className="p-0">
              {invites.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum convite gerado. Crie convites e compartilhe o link público manualmente.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Respondido</TableHead>
                      <TableHead className="text-right">Link público</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.client?.company_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{new Date(i.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {i.responded_at ? (
                            <Badge className="bg-green-600 hover:bg-green-700">Sim</Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => copyLink(i.token)}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responses">
          <Card>
            <CardContent className="p-0">
              {responses.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Ainda não há respostas registradas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Respondente</TableHead>
                      {campaign.collects_nps && <TableHead>NPS</TableHead>}
                      {campaign.collects_csat && <TableHead>CSAT</TableHead>}
                      {campaign.collects_ces && <TableHead>CES</TableHead>}
                      <TableHead>Comentário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.responder_name ?? "Anônimo"}</div>
                          {r.responder_email && (
                            <div className="text-xs text-muted-foreground">{r.responder_email}</div>
                          )}
                        </TableCell>
                        {campaign.collects_nps && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{r.nps_score ?? "—"}</span>
                              {npsBadge(r.derived_nps)}
                            </div>
                          </TableCell>
                        )}
                        {campaign.collects_csat && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{r.csat_score ?? "—"}</span>
                              {csatBadge(r.derived_csat)}
                            </div>
                          </TableCell>
                        )}
                        {campaign.collects_ces && (
                          <TableCell>
                            <span className="font-semibold">{r.ces_score ?? "—"}</span>
                          </TableCell>
                        )}
                        <TableCell className="max-w-xs truncate">
                          {r.comment || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>{new Date(r.responded_at).toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
