import { useState, useEffect } from "react";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutCfg {
  header_text?: string;
  footer_text?: string;
  logo_url?: string;
  primary_color?: string;
  show_approval_stamp?: boolean;
  uncontrolled_watermark?: boolean;
}

export default function LayoutGlobal() {
  const { settings, isLoading } = useQualitySettings();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<LayoutCfg>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCfg(((settings as any)?.document_layout ?? {}) as LayoutCfg);
  }, [settings]);

  const save = async () => {
    if (!profile?.company_id) return;
    setSaving(true);
    const { error } = await supabase
      .from("quality_settings" as any)
      .update({ document_layout: cfg } as any)
      .eq("company_id", profile.company_id);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["quality_settings"] });
    toast({ title: "Layout salvo" });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Layout global</h2>
        <p className="text-sm text-muted-foreground">Aplicado em todos os PDFs do portal de Qualidade.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Identidade</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>URL do logo</Label>
            <Input value={cfg.logo_url ?? ""} onChange={(e) => setCfg({ ...cfg, logo_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label>Cor primária</Label>
            <Input type="color" value={cfg.primary_color ?? "#0f172a"} onChange={(e) => setCfg({ ...cfg, primary_color: e.target.value })} className="w-24 h-10 p-1" />
          </div>
          <div>
            <Label>Cabeçalho (header)</Label>
            <Textarea value={cfg.header_text ?? ""} onChange={(e) => setCfg({ ...cfg, header_text: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Rodapé (footer)</Label>
            <Textarea value={cfg.footer_text ?? ""} onChange={(e) => setCfg({ ...cfg, footer_text: e.target.value })} rows={2} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Mostrar carimbo de aprovação do Master</Label>
            <Switch checked={cfg.show_approval_stamp ?? true} onCheckedChange={(v) => setCfg({ ...cfg, show_approval_stamp: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Marca-d&apos;água &quot;CÓPIA NÃO CONTROLADA&quot;</Label>
            <Switch checked={cfg.uncontrolled_watermark ?? true} onCheckedChange={(v) => setCfg({ ...cfg, uncontrolled_watermark: v })} />
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>Salvar layout</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="border rounded-md p-6 bg-card text-card-foreground space-y-3" style={{ borderTopColor: cfg.primary_color, borderTopWidth: 4 }}>
            <div className="flex items-center justify-between">
              {cfg.logo_url ? <img src={cfg.logo_url} alt="logo" className="h-10" /> : <div className="h-10 w-32 bg-muted rounded" />}
              <span className="text-xs text-muted-foreground whitespace-pre-line">{cfg.header_text}</span>
            </div>
            <div className="py-10 text-center text-muted-foreground text-sm">[conteúdo do documento]</div>
            <div className="border-t pt-2 text-xs text-muted-foreground whitespace-pre-line">{cfg.footer_text}</div>
            {cfg.uncontrolled_watermark && <p className="text-center text-xs font-bold text-muted-foreground/60">CÓPIA NÃO CONTROLADA (preview)</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
