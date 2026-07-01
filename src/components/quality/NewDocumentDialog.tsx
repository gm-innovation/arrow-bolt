import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useQualityDocumentTypes } from "@/hooks/useQualityDocumentTypes";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";

type DocOrigin = "internal" | "client" | "external_norm" | "external_law" | "external_certificate" | "safety";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
  lockedOrigin?: DocOrigin;
  typeCodePrefixes?: string[];
  title?: string;
}

const NewDocumentDialog = ({ open, onOpenChange, onCreated, lockedOrigin, typeCodePrefixes, title }: Props) => {
  const { create } = useQualityDocuments();
  const { types: allTypes } = useQualityDocumentTypes();
  const { data: companyUsers = [] } = useCompanyUsers();
  const types = typeCodePrefixes && typeCodePrefixes.length > 0
    ? allTypes.filter((t: any) => typeCodePrefixes.includes(t.code_prefix))
    : allTypes;
  const [form, setForm] = useState({
    document_type_id: "",
    code: "",
    title: "",
    classification: "",
    normative_reference: "",
    next_review_date: "",
    widely_visible: false,
    origin: "internal" as "internal" | "client" | "external_norm" | "external_law" | "external_certificate" | "safety",
    external_source: "",
    validity_start: "",
    validity_end: "",
    auto_renewal: false,
    document_control_mode: "full_control" as "full_control" | "received_only",
    responsible_user_id: "",
    control_mode: "" as "" | "controlled" | "uncontrolled",
  });

  useEffect(() => {
    if (open) {
      setForm({
        document_type_id: "",
        code: "",
        title: "",
        classification: "",
        normative_reference: "",
        next_review_date: "",
        widely_visible: false,
        origin: lockedOrigin ?? "internal",
        external_source: "",
        validity_start: "",
        validity_end: "",
        auto_renewal: false,
        document_control_mode: "full_control",
        responsible_user_id: "",
        control_mode: "",
      });
    }
  }, [open, lockedOrigin]);

  const selectedType = types.find((t) => t.id === form.document_type_id);

  const onPickType = (id: string) => {
    const t = types.find((tt) => tt.id === id);
    setForm((f) => ({
      ...f,
      document_type_id: id,
      classification: f.classification || t?.default_classification || "",
    }));
  };

  const submit = async () => {
    if (!form.code || !form.title) return;
    const isExternal = form.origin !== "internal";
    const created = await create.mutateAsync({
      code: form.code.trim(),
      title: form.title.trim(),
      document_type_id: form.document_type_id || null,
      classification: form.classification || null,
      normative_reference: form.normative_reference || null,
      next_review_date: form.next_review_date || null,
      widely_visible: form.widely_visible,
      origin: form.origin,
      external_source: isExternal ? form.external_source || null : null,
      validity_start: isExternal && form.validity_start ? form.validity_start : null,
      validity_end: isExternal && form.validity_end ? form.validity_end : null,
      auto_renewal: form.auto_renewal,
      document_control_mode: form.document_control_mode,
      responsible_user_id: form.responsible_user_id || null,
      control_mode: form.control_mode || null,
    } as any);
    onOpenChange(false);
    onCreated?.((created as any).id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Novo Documento"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.document_type_id} onValueChange={onPickType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code_prefix} — {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {types.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Cadastre tipos em Configurações primeiro.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={selectedType ? `${selectedType.code_prefix}-001` : "Ex.: PR-001"}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Classificação *</Label>
              <Select
                value={form.control_mode === "uncontrolled" ? "Não controlada" : (form.classification || "Controlada")}
                onValueChange={(v) => setForm({
                  ...form,
                  classification: v,
                  control_mode: v === "Não controlada" ? "uncontrolled" : "controlled",
                })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Controlada">Controlada</SelectItem>
                  <SelectItem value="Não controlada">Não controlada</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                "Não controlada" aplica marca d'água no visualizador.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Próxima Revisão</Label>
              <Input
                type="date"
                value={form.next_review_date}
                onChange={(e) => setForm({ ...form, next_review_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Referência Normativa</Label>
            <Textarea
              rows={2}
              value={form.normative_reference}
              onChange={(e) => setForm({ ...form, normative_reference: e.target.value })}
              placeholder="Ex.: ISO 9001:2015, item 7.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={form.origin} onValueChange={(v) => setForm({ ...form, origin: v as any })} disabled={!!lockedOrigin}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                  <SelectItem value="external_norm">Norma externa</SelectItem>
                  <SelectItem value="external_law">Lei / Regulamento</SelectItem>
                  <SelectItem value="external_certificate">Certificado / Licença</SelectItem>
                  <SelectItem value="safety">Saúde e Segurança</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Modo de controle</Label>
              <Select
                value={form.document_control_mode}
                onValueChange={(v) => setForm({ ...form, document_control_mode: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_control">Controle total (revisão + aprovação)</SelectItem>
                  <SelectItem value="received_only">Apenas registro de ciência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Responsável</Label>
            <Select
              value={form.responsible_user_id || "none"}
              onValueChange={(v) => setForm({ ...form, responsible_user_id: v === "none" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem responsável —</SelectItem>
                {(companyUsers as any[]).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.origin !== "internal" && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <div className="space-y-1">
                <Label>Origem / Emissor</Label>
                <Input
                  value={form.external_source}
                  onChange={(e) => setForm({ ...form, external_source: e.target.value })}
                  placeholder="Ex.: ABNT, Marinha do Brasil, Cliente X"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Início da validade</Label>
                  <Input type="date" value={form.validity_start} onChange={(e) => setForm({ ...form, validity_start: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Fim da validade</Label>
                  <Input type="date" value={form.validity_end} onChange={(e) => setForm({ ...form, validity_end: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Renovação automática (informativo)</Label>
                <Switch checked={form.auto_renewal} onCheckedChange={(v) => setForm({ ...form, auto_renewal: v })} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>Visibilidade ampliada</Label>
              <p className="text-xs text-muted-foreground">
                Quando publicado, fica visível para todos da empresa (ex.: Política da Qualidade).
              </p>
            </div>
            <Switch
              checked={form.widely_visible}
              onCheckedChange={(v) => setForm({ ...form, widely_visible: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!form.code || !form.title || create.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDocumentDialog;
