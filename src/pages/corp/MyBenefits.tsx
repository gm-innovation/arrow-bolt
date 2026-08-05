import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Handshake, Megaphone, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useCompanyBenefits, useHRCampaigns, CAMPAIGN_TYPES } from '@/hooks/useHRBenefits';
import { usePartnerships } from '@/hooks/usePartnerships';

const MyBenefits = () => {
  const { benefits, isLoading: loadingBenefits } = useCompanyBenefits();
  const { partnerships, isLoading: loadingPartnerships } = usePartnerships();
  const { campaigns, isLoading: loadingCampaigns } = useHRCampaigns();

  const activeBenefits = benefits.filter((b) => b.is_active);
  const activePartnerships = partnerships.filter((p) => p.is_active);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Gift className="h-7 w-7" /> Benefícios e Vantagens</h1>
        <p className="text-muted-foreground">Tudo o que a empresa oferece a você, além dos convênios e campanhas internas em andamento.</p>
      </div>

      <Tabs defaultValue="benefits">
        <TabsList>
          <TabsTrigger value="benefits">Benefícios</TabsTrigger>
          <TabsTrigger value="partnerships">Convênios</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="pt-4">
          {loadingBenefits ? <Skeleton className="h-48" /> : activeBenefits.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum benefício publicado ainda</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBenefits.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="pb-2"><CardTitle className="text-lg">{b.title}</CardTitle></CardHeader>
                  {b.description && <CardContent className="text-sm text-muted-foreground">{b.description}</CardContent>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="partnerships" className="pt-4">
          {loadingPartnerships ? <Skeleton className="h-48" /> : activePartnerships.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum convênio ativo</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activePartnerships.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><Handshake className="h-4 w-4" />{p.name}</CardTitle>
                    {p.category && <Badge variant="secondary" className="w-fit mt-1">{p.category}</Badge>}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {p.benefit && <p className="font-medium text-primary">{p.benefit}</p>}
                    {p.description && <p className="text-muted-foreground">{p.description}</p>}
                    {p.contact && <p><span className="text-muted-foreground">Contato:</span> {p.contact}</p>}
                    {p.link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={p.link} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Acessar</a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="pt-4">
          {loadingCampaigns ? <Skeleton className="h-48" /> : activeCampaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma campanha em andamento</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCampaigns.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-4 w-4" />{c.title}</CardTitle>
                    <Badge variant="secondary" className="w-fit mt-1">{CAMPAIGN_TYPES.find((t) => t.value === c.campaign_type)?.label || c.campaign_type}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {c.description && <p className="text-muted-foreground whitespace-pre-line">{c.description}</p>}
                    {(c.starts_on || c.ends_on) && (
                      <p className="text-xs text-muted-foreground">
                        Período: {c.starts_on ? format(parseISO(c.starts_on), 'dd/MM/yyyy') : '—'} → {c.ends_on ? format(parseISO(c.ends_on), 'dd/MM/yyyy') : '—'}
                      </p>
                    )}
                    {c.cta_link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={c.cta_link} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />{c.cta_label || 'Participar'}</a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyBenefits;
