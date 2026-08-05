import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Gift, Edit, Trash2, Megaphone, Send, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useCompanyBenefits, useHRCampaigns, CompanyBenefit, HRCampaign,
  CAMPAIGN_TYPES, CAMPAIGN_STATUS_LABELS, CampaignStatus,
} from '@/hooks/useHRBenefits';

const emptyBenefit: Partial<CompanyBenefit> = { title: '', description: '', display_order: 0, is_active: true };
const emptyCampaign: Partial<HRCampaign> & { publish?: boolean } = {
  title: '', description: '', campaign_type: 'campanha', status: 'draft', audience: '', cta_label: '', cta_link: '', publish: false,
};

const statusVariant = (s: CampaignStatus) =>
  s === 'active' ? 'default' : s === 'draft' ? 'secondary' : 'outline';

const Benefits = () => {
  const { benefits, isLoading: loadingBenefits, create: createBenefit, update: updateBenefit, remove: removeBenefit } = useCompanyBenefits();
  const { campaigns, isLoading: loadingCampaigns, create: createCampaign, update: updateCampaign, remove: removeCampaign, announce } = useHRCampaigns();

  const [benefitDialog, setBenefitDialog] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<CompanyBenefit | null>(null);
  const [benefitForm, setBenefitForm] = useState<Partial<CompanyBenefit>>(emptyBenefit);

  const [campaignDialog, setCampaignDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<HRCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState<Partial<HRCampaign> & { publish?: boolean }>(emptyCampaign);

  const submitBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBenefit) await updateBenefit.mutateAsync({ id: editingBenefit.id, ...benefitForm });
    else await createBenefit.mutateAsync(benefitForm);
    setBenefitDialog(false);
  };

  const submitCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...campaignForm,
      starts_on: campaignForm.starts_on || null,
      ends_on: campaignForm.ends_on || null,
    };
    if (editingCampaign) {
      const { publish, ...rest } = payload;
      await updateCampaign.mutateAsync({ id: editingCampaign.id, ...rest });
    } else {
      await createCampaign.mutateAsync(payload);
    }
    setCampaignDialog(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Gift className="h-7 w-7" /> Benefícios e Endomarketing</h1>
        <p className="text-muted-foreground">Catálogo de benefícios da empresa e campanhas internas de comunicação.</p>
      </div>

      <Tabs defaultValue="benefits">
        <TabsList>
          <TabsTrigger value="benefits">Benefícios ({benefits.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas ({campaigns.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="benefits" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingBenefit(null); setBenefitForm(emptyBenefit); setBenefitDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Novo Benefício
            </Button>
          </div>
          {loadingBenefits ? (
            <Skeleton className="h-64" />
          ) : benefits.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum benefício cadastrado. Os benefícios aparecem na página de carreiras e no portal do colaborador.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefits.map((b) => (
                <Card key={b.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{b.title}</CardTitle>
                      <Badge variant={b.is_active ? 'default' : 'outline'}>{b.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {b.description && <p className="text-muted-foreground">{b.description}</p>}
                    <p className="text-xs text-muted-foreground">Ordem: {b.display_order}</p>
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingBenefit(b); setBenefitForm(b); setBenefitDialog(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este benefício?')) removeBenefit.mutate(b.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingCampaign(null); setCampaignForm(emptyCampaign); setCampaignDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />Nova Campanha
            </Button>
          </div>
          {loadingCampaigns ? (
            <Skeleton className="h-64" />
          ) : campaigns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma campanha interna criada</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2"><Megaphone className="h-4 w-4" />{c.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">{CAMPAIGN_TYPES.find((t) => t.value === c.campaign_type)?.label || c.campaign_type}</Badge>
                      </div>
                      <Badge variant={statusVariant(c.status)}>{CAMPAIGN_STATUS_LABELS[c.status]}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {c.description && <p className="text-muted-foreground whitespace-pre-line">{c.description}</p>}
                    {c.audience && <p><span className="text-muted-foreground">Público:</span> {c.audience}</p>}
                    {(c.starts_on || c.ends_on) && (
                      <p className="text-xs text-muted-foreground">
                        Período: {c.starts_on ? format(parseISO(c.starts_on), 'dd/MM/yyyy') : '—'} → {c.ends_on ? format(parseISO(c.ends_on), 'dd/MM/yyyy') : '—'}
                      </p>
                    )}
                    {c.feed_post_id && <p className="text-xs text-primary">Divulgada no feed</p>}
                    <div className="flex items-center gap-1 pt-1">
                      {c.cta_link && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={c.cta_link} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />{c.cta_label || 'Abrir'}</a>
                        </Button>
                      )}
                      {!c.feed_post_id && (
                        <Button variant="outline" size="sm" onClick={() => announce.mutate(c)} disabled={announce.isPending}>
                          <Send className="h-3 w-3 mr-1" />Divulgar no feed
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCampaign(c); setCampaignForm(c); setCampaignDialog(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover esta campanha?')) removeCampaign.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={benefitDialog} onOpenChange={setBenefitDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBenefit ? 'Editar Benefício' : 'Novo Benefício'}</DialogTitle></DialogHeader>
          <form onSubmit={submitBenefit} className="space-y-3">
            <div className="space-y-2"><Label>Título *</Label><Input required value={benefitForm.title || ''} onChange={(e) => setBenefitForm({ ...benefitForm, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={benefitForm.description || ''} onChange={(e) => setBenefitForm({ ...benefitForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Ordem de exibição</Label><Input type="number" value={benefitForm.display_order ?? 0} onChange={(e) => setBenefitForm({ ...benefitForm, display_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={!!benefitForm.is_active} onCheckedChange={(v) => setBenefitForm({ ...benefitForm, is_active: v })} /><Label>Ativo</Label></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setBenefitDialog(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={campaignDialog} onOpenChange={setCampaignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle></DialogHeader>
          <form onSubmit={submitCampaign} className="space-y-3">
            <div className="space-y-2"><Label>Título *</Label><Input required value={campaignForm.title || ''} onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={campaignForm.campaign_type} onValueChange={(v) => setCampaignForm({ ...campaignForm, campaign_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CAMPAIGN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select value={campaignForm.status} onValueChange={(v) => setCampaignForm({ ...campaignForm, status: v as CampaignStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((s) => <SelectItem key={s} value={s}>{CAMPAIGN_STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea rows={4} value={campaignForm.description || ''} onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Público-alvo</Label><Input placeholder="Ex.: Todos os colaboradores" value={campaignForm.audience || ''} onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Início</Label><Input type="date" value={campaignForm.starts_on || ''} onChange={(e) => setCampaignForm({ ...campaignForm, starts_on: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fim</Label><Input type="date" value={campaignForm.ends_on || ''} onChange={(e) => setCampaignForm({ ...campaignForm, ends_on: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Rótulo do link</Label><Input placeholder="Inscreva-se" value={campaignForm.cta_label || ''} onChange={(e) => setCampaignForm({ ...campaignForm, cta_label: e.target.value })} /></div>
              <div className="space-y-2"><Label>Link</Label><Input type="url" value={campaignForm.cta_link || ''} onChange={(e) => setCampaignForm({ ...campaignForm, cta_link: e.target.value })} /></div>
            </div>
            {!editingCampaign && (
              <div className="flex items-center gap-2">
                <Switch checked={!!campaignForm.publish} onCheckedChange={(v) => setCampaignForm({ ...campaignForm, publish: v })} />
                <Label>Divulgar no feed corporativo ao salvar</Label>
              </div>
            )}
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCampaignDialog(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Benefits;
