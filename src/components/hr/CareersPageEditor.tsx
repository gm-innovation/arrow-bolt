import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { usePersistentDraft } from "@/hooks/usePersistentDraft";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Heart,
  Home,
  GraduationCap,
  Coffee,
  Plane,
  Shield,
  Gift,
  Briefcase,
  Users,
  Activity,
  BookOpen,
  Wallet,
  Sparkles,
  UtensilsCrossed,
  Utensils,
  Stethoscope,
  Dumbbell,
  Bus,
} from "lucide-react";

const ICON_OPTIONS = [
  { name: "Stethoscope", Icon: Stethoscope, label: "Plano de saúde" },
  { name: "UtensilsCrossed", Icon: UtensilsCrossed, label: "Vale alimentação / refeição" },
  { name: "Utensils", Icon: Utensils, label: "Refeitório" },
  { name: "Bus", Icon: Bus, label: "Vale transporte" },
  { name: "Dumbbell", Icon: Dumbbell, label: "Academia" },
  { name: "Heart", Icon: Heart, label: "Coração" },
  { name: "Home", Icon: Home, label: "Casa / Home Office" },
  { name: "GraduationCap", Icon: GraduationCap, label: "Educação" },
  { name: "Coffee", Icon: Coffee, label: "Café / Convivência" },
  { name: "Plane", Icon: Plane, label: "Viagem / Férias" },
  { name: "Shield", Icon: Shield, label: "Seguro / Proteção" },
  { name: "Gift", Icon: Gift, label: "Presente / Bônus" },
  { name: "Briefcase", Icon: Briefcase, label: "Trabalho" },
  { name: "Users", Icon: Users, label: "Pessoas / Equipe" },
  { name: "Activity", Icon: Activity, label: "Saúde / Bem-estar" },
  { name: "BookOpen", Icon: BookOpen, label: "Leitura / Conhecimento" },
  { name: "Wallet", Icon: Wallet, label: "Financeiro" },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  ICON_OPTIONS.map((o) => [o.name, o.Icon]),
);

type Benefit = {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
};

type CareersAboutDraft = {
  aboutTitle: string;
  aboutText: string;
  mission: string;
  values: string[];
  valueDraft: string;
};

const normalizeValues = (values: string[]) => values.map((value) => value.trim()).filter(Boolean);

const CareersPageEditor = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  // ----- About / institutional -----
  const { data: company, refetch } = useQuery({
    queryKey: ["company-careers-about", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("careers_about_title, careers_about_text, careers_mission, careers_values")
        .eq("id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutStatus, setAboutStatus] = useState<"idle" | "saved" | "error">("idle");

  const savedAbout = useMemo<CareersAboutDraft>(() => ({
    aboutTitle: ((company as any)?.careers_about_title || "") as string,
    aboutText: ((company as any)?.careers_about_text || "") as string,
    mission: ((company as any)?.careers_mission || "") as string,
    values: ((company as any)?.careers_values || []) as string[],
    valueDraft: "",
  }), [company]);

  const draftKey = companyId && company ? `careers-about-draft:${companyId}` : null;
  const { draft, setDraft, hydrated, hasStoredDraft, clearDraft } = usePersistentDraft<CareersAboutDraft>({
    storageKey: draftKey,
    initialValue: savedAbout,
    enabled: !!company,
    storage: "local",
  });

  const { aboutTitle, aboutText, mission, values, valueDraft } = draft;

  const hasUnsavedChanges = hydrated && company && (
    aboutTitle !== savedAbout.aboutTitle ||
    aboutText !== savedAbout.aboutText ||
    mission !== savedAbout.mission ||
    JSON.stringify(values) !== JSON.stringify(savedAbout.values) ||
    valueDraft.trim().length > 0
  );

  const addValue = () => {
    const v = valueDraft.trim();
    if (!v) return;
    setDraft((current) => ({ ...current, values: [...current.values, v], valueDraft: "" }));
  };

  const removeValue = (i: number) => {
    setDraft((current) => ({ ...current, values: current.values.filter((_, idx) => idx !== i) }));
  };

  const saveAbout = async () => {
    if (!companyId) return;
    setSavingAbout(true);
    setAboutStatus("idle");
    const payload = {
      careers_about_title: aboutTitle.trim() || null,
      careers_about_text: aboutText.trim() || null,
      careers_mission: mission.trim() || null,
      careers_values: normalizeValues(values).length ? normalizeValues(values) : null,
    } as any;

    const { data: updated, error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", companyId)
      .select("careers_about_title, careers_about_text, careers_mission, careers_values")
      .maybeSingle();
    setSavingAbout(false);
    if (error) {
      setAboutStatus("error");
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    const confirmed = updated ?? null;
    const savedValues = (confirmed as any)?.careers_values || [];
    const expectedValues = payload.careers_values || [];
    const matches = !!confirmed &&
      ((confirmed as any).careers_about_title || "") === (payload.careers_about_title || "") &&
      ((confirmed as any).careers_about_text || "") === (payload.careers_about_text || "") &&
      ((confirmed as any).careers_mission || "") === (payload.careers_mission || "") &&
      JSON.stringify(savedValues) === JSON.stringify(expectedValues);

    if (!matches) {
      setAboutStatus("error");
      toast({
        title: "Salvamento não confirmado",
        description: "Mantive seu rascunho local. Tente salvar novamente antes de sair.",
        variant: "destructive",
      });
      return;
    }

    clearDraft();
    await refetch();
    setAboutStatus("saved");
    qc.invalidateQueries({ queryKey: ["company-careers-about", companyId] });
    qc.invalidateQueries({ queryKey: ["company-public-slug", companyId] });
    toast({ title: "Página de carreiras publicada" });
  };

  // ----- Benefits CRUD -----
  const { data: benefits } = useQuery({
    queryKey: ["company-benefits", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_benefits" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Benefit[];
    },
    enabled: !!companyId,
  });

  const [editing, setEditing] = useState<Partial<Benefit> | null>(null);

  const upsertMutation = useMutation({
    mutationFn: async (b: Partial<Benefit>) => {
      if (!companyId) throw new Error("sem empresa");
      const payload: any = {
        company_id: companyId,
        title: (b.title || "").trim(),
        description: b.description?.trim() || null,
        icon: b.icon || null,
        display_order: b.display_order ?? (benefits?.length || 0),
        is_active: b.is_active ?? true,
      };
      if (b.id) {
        const { error } = await supabase.from("company_benefits" as any).update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("company_benefits" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-benefits", companyId] });
      setEditing(null);
      toast({ title: "Benefício salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("company_benefits" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company-benefits", companyId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_benefits" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-benefits", companyId] });
      toast({ title: "Benefício removido" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Sobre / Cultura */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre a empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título do bloco</Label>
            <Input
              value={aboutTitle}
              onChange={(e) => setDraft((current) => ({ ...current, aboutTitle: e.target.value }))}
              placeholder={`Ex.: Conheça a ${profile?.company_id ? "nossa empresa" : ""}`}
            />
          </div>
          <div>
            <Label>Sobre / Cultura</Label>
            <Textarea
              value={aboutText}
              onChange={(e) => setDraft((current) => ({ ...current, aboutText: e.target.value }))}
              rows={6}
              placeholder="Descreva o ambiente de trabalho, história, cultura e o que torna sua empresa única."
            />
            <p className="text-xs text-muted-foreground mt-1">Quebras de linha são preservadas.</p>
          </div>
          <div>
            <Label>Missão</Label>
            <Textarea
              value={mission}
              onChange={(e) => setDraft((current) => ({ ...current, mission: e.target.value }))}
              rows={2}
              placeholder="Frase curta com a missão da empresa."
            />
          </div>
          <div>
            <Label>Valores</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={valueDraft}
                onChange={(e) => setDraft((current) => ({ ...current, valueDraft: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addValue();
                  }
                }}
                placeholder="Ex.: Excelência operacional"
              />
              <Button type="button" variant="outline" onClick={addValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {values.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {values.map((v, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 pl-3 pr-1.5 py-1.5">
                    {v}
                    <button
                      type="button"
                      onClick={() => removeValue(i)}
                      className="hover:bg-background rounded p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-3">
            {savingAbout ? (
              <span className="text-xs text-muted-foreground">Salvando e confirmando...</span>
            ) : aboutStatus === "saved" ? (
              <span className="text-xs text-emerald-600">Publicado com sucesso</span>
            ) : aboutStatus === "error" ? (
              <span className="text-xs text-destructive">Rascunho preservado localmente</span>
            ) : hasUnsavedChanges || hasStoredDraft ? (
              <span className="text-xs text-amber-600">Rascunho salvo localmente</span>
            ) : null}
            <Button onClick={saveAbout} disabled={savingAbout}>
              {savingAbout ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Benefícios */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Benefícios</CardTitle>
          <Button
            size="sm"
            onClick={() =>
              setEditing({ title: "", description: "", icon: "Sparkles", is_active: true })
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Novo benefício
          </Button>
        </CardHeader>
        <CardContent>
          {!benefits || benefits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum benefício cadastrado. Adicione cards para destacar o que sua empresa oferece.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {benefits.map((b) => {
                const Icon = (b.icon && ICON_MAP[b.icon]) || Sparkles;
                return (
                  <div
                    key={b.id}
                    className="border rounded-md p-4 bg-card flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="inline-flex items-center justify-center w-9 h-9 rounded bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={b.is_active}
                          onCheckedChange={(v) => toggleActive.mutate({ id: b.id, is_active: v })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => setEditing(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover este benefício?")) deleteMutation.mutate(b.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="font-semibold">{b.title}</div>
                    {b.description && (
                      <p className="text-sm text-muted-foreground">{b.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar benefício" : "Novo benefício"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={editing?.title || ""}
                onChange={(e) => setEditing((s) => ({ ...(s || {}), title: e.target.value }))}
                placeholder="Ex.: Plano de saúde"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={editing?.description || ""}
                onChange={(e) => setEditing((s) => ({ ...(s || {}), description: e.target.value }))}
                rows={3}
                placeholder="Detalhes do benefício."
              />
            </div>
            <div>
              <Label>Ícone</Label>
              <Select
                value={editing?.icon || ""}
                onValueChange={(v) => setEditing((s) => ({ ...(s || {}), icon: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um ícone" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(({ name, Icon, label }) => (
                    <SelectItem key={name} value={name}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={editing?.display_order ?? 0}
                onChange={(e) =>
                  setEditing((s) => ({ ...(s || {}), display_order: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editing && upsertMutation.mutate(editing)}
              disabled={!editing?.title?.trim() || upsertMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CareersPageEditor;
