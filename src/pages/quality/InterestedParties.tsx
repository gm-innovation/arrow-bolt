import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQualityInterestedParties, QIPCategory } from "@/hooks/useQualityInterestedParties";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import InterestedPartyDrawer from "@/components/quality/InterestedPartyDrawer";
import { Plus, Users, Trash2, CheckCircle2, AlertTriangle, Clock, Grid3x3 } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, ReferenceLine, ZAxis,
} from "recharts";

const CATEGORIES: { value: QIPCategory; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "orgao_regulador", label: "Órgão Regulador" },
  { value: "sociedade", label: "Sociedade" },
  { value: "colaborador", label: "Colaborador" },
  { value: "acionista", label: "Acionista" },
  { value: "parceiro", label: "Parceiro" },
  { value: "outro", label: "Outro" },
];

const RELEVANCES = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

const TREATMENT_LABELS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "border-yellow-500 text-yellow-700" },
  em_andamento: { label: "Em andamento", tone: "border-blue-500 text-blue-700" },
  atendida: { label: "Atendida", tone: "border-green-500 text-green-700" },
  nao_aplicavel: { label: "Não aplicável", tone: "border-muted-foreground text-muted-foreground" },
};

const InterestedParties = () => {
  const { parties, latestEvidences, isLoading, create, update, remove } = useQualityInterestedParties();
  const { cycles } = useQualitySettings();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "cliente" as QIPCategory,
    needs_expectations: "",
    monitoring_method: "",
    relevance: "media",
    review_frequency_months: String(cycles.interested_parties_months),
    power_level: "3",
    interest_level: "3",
  });

  const submit = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync({
      name: form.name.trim(),
      category: form.category,
      needs_expectations: form.needs_expectations || null,
      monitoring_method: form.monitoring_method || null,
      relevance: form.relevance as any,
      review_frequency_months: Number(form.review_frequency_months) || cycles.interested_parties_months,
      power_level: Number(form.power_level) || 3,
      interest_level: Number(form.interest_level) || 3,
    } as any);
    setForm({
      name: "",
      category: "cliente",
      needs_expectations: "",
      monitoring_method: "",
      relevance: "media",
      review_frequency_months: String(cycles.interested_parties_months),
      power_level: "3",
      interest_level: "3",
    });
    setOpen(false);
  };

  const lastByParty = new Map<string, (typeof latestEvidences)[number]>();
  for (const ev of latestEvidences) {
    if (!lastByParty.has(ev.party_id)) lastByParty.set(ev.party_id, ev);
  }

  const statusOf = (dueIso: string | null) => {
    if (!dueIso) return null;
    const days = differenceInDays(parseISO(dueIso), new Date());
    if (days < 0) return { tone: "destructive" as const, label: `Vencida há ${Math.abs(days)}d`, icon: AlertTriangle };
    if (days <= cycles.alert_window_days)
      return { tone: "warning" as const, label: `Em ${days}d`, icon: Clock };
    return { tone: "success" as const, label: `Em dia`, icon: CheckCircle2 };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Partes Interessadas
          </h2>
          <p className="text-muted-foreground">
            Identificação, necessidades/expectativas e ciclo de revisão das partes interessadas do SGQ.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova parte interessada</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova parte interessada</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Categoria *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as QIPCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Relevância</Label>
                  <Select value={form.relevance} onValueChange={(v) => setForm({ ...form, relevance: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELEVANCES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Necessidades e expectativas</Label>
                <Textarea
                  rows={3}
                  value={form.needs_expectations}
                  onChange={(e) => setForm({ ...form, needs_expectations: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Método de monitoramento</Label>
                <Textarea
                  rows={2}
                  value={form.monitoring_method}
                  onChange={(e) => setForm({ ...form, monitoring_method: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Ciclo de revisão (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.review_frequency_months}
                    onChange={(e) => setForm({ ...form, review_frequency_months: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Poder (1-5)</Label>
                  <Input
                    type="number" min={1} max={5}
                    value={form.power_level}
                    onChange={(e) => setForm({ ...form, power_level: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Interesse (1-5)</Label>
                  <Input
                    type="number" min={1} max={5}
                    value={form.interest_level}
                    onChange={(e) => setForm({ ...form, interest_level: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={!form.name.trim()}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><Users className="h-3.5 w-3.5 mr-1" /> Lista</TabsTrigger>
          <TabsTrigger value="matrix"><Grid3x3 className="h-3.5 w-3.5 mr-1" /> Matriz Poder × Interesse</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">

      <Card>
        <CardHeader><CardTitle>Lista</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-6 text-muted-foreground">Carregando...</p>
          ) : parties.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground">
              Nenhuma parte interessada cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Relevância</TableHead>
                  <TableHead>Tratativa</TableHead>
                  <TableHead>Última evidência</TableHead>
                  <TableHead>Próxima revisão</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((p) => {
                  const last = lastByParty.get(p.id);
                  const lastDays = last?.valid_until ? differenceInDays(parseISO(last.valid_until), new Date()) : null;
                  const st = statusOf(p.next_review_due_at);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelected(p.id)}
                    >
                      <TableCell className="font-medium">
                        {p.name}
                        <Badge variant="outline" className="ml-2 capitalize">{p.status}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{CATEGORIES.find((c) => c.value === p.category)?.label ?? p.category}</TableCell>
                      <TableCell className="capitalize">{p.relevance}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={(p as any).treatment_status || "pendente"}
                          onValueChange={(v) => update.mutate({ id: p.id, treatment_status: v } as any)}
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TREATMENT_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {last ? (
                          <div className="text-sm">
                            <div>{last.title}</div>
                            {lastDays !== null && (
                              <div className={lastDays < 0 ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>
                                {lastDays < 0 ? `Venceu há ${Math.abs(lastDays)}d` : `Vence em ${lastDays}d`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {st ? (
                          <Badge
                            variant={st.tone === "destructive" ? "destructive" : "outline"}
                            className={st.tone === "warning" ? "border-yellow-500 text-yellow-700" : st.tone === "success" ? "border-green-500 text-green-700" : ""}
                          >
                            <st.icon className="h-3 w-3 mr-1" />
                            {st.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remover ${p.name}?`)) remove.mutate(p.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriz Poder × Interesse</CardTitle>
              <p className="text-xs text-muted-foreground">
                Quadrantes: <b>Gerenciar de perto</b> (alto poder, alto interesse) · <b>Manter satisfeito</b> (alto poder, baixo interesse) · <b>Manter informado</b> (baixo poder, alto interesse) · <b>Monitorar</b> (baixo, baixo).
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number" dataKey="interest" name="Interesse" domain={[0, 6]} ticks={[1, 2, 3, 4, 5]}
                      label={{ value: "Interesse →", position: "insideBottom", offset: -10 }}
                    />
                    <YAxis
                      type="number" dataKey="power" name="Poder" domain={[0, 6]} ticks={[1, 2, 3, 4, 5]}
                      label={{ value: "Poder →", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[80, 80]} />
                    <ReferenceLine x={3} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                    <ReferenceLine y={3} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                    <RTooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d: any = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-md p-2 text-xs shadow">
                            <div className="font-semibold">{d.name}</div>
                            <div className="text-muted-foreground capitalize">{d.category}</div>
                            <div>Poder: {d.power} · Interesse: {d.interest}</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Partes"
                      data={parties.map((p) => ({
                        name: p.name,
                        category: p.category,
                        power: p.power_level ?? 3,
                        interest: p.interest_level ?? 3,
                        z: 1,
                        id: p.id,
                      }))}
                      fill="hsl(var(--primary))"
                      onClick={(e: any) => e?.id && setSelected(e.id)}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="border rounded p-2 bg-amber-50 dark:bg-amber-950/30">
                  <b>Manter satisfeito</b> (poder alto, interesse baixo)
                </div>
                <div className="border rounded p-2 bg-rose-50 dark:bg-rose-950/30">
                  <b>Gerenciar de perto</b> (poder alto, interesse alto)
                </div>
                <div className="border rounded p-2 bg-muted">
                  <b>Monitorar</b> (poder baixo, interesse baixo)
                </div>
                <div className="border rounded p-2 bg-sky-50 dark:bg-sky-950/30">
                  <b>Manter informado</b> (poder baixo, interesse alto)
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InterestedPartyDrawer
        partyId={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
};

export default InterestedParties;
