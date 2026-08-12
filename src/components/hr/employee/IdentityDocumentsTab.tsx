import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useEmployeeIdentityDocuments,
  useSaveRegistryRow,
  useDeleteRegistryRow,
} from "@/hooks/useEmployeeRegistry";
import { IDENTITY_DOC_STATUS, IDENTITY_DOC_TYPES, optionLabel } from "@/lib/hr/employeeRegistry";
import { MaskedField } from "./MaskedField";
import { formatLocalDate } from "@/lib/utils";
import { statusFromExpiry } from "@/lib/hr/documentStatus";

const empty = {
  doc_type: "rg",
  number: "",
  issuer: "",
  issuer_state: "",
  issue_date: "",
  expiry_date: "",
  category: "",
  status: "pendente",
};

/** Documentos de identificação (CPF, RG, CNH, CTPS, PIS...). */
export function IdentityDocumentsTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const { data: docs = [] } = useEmployeeIdentityDocuments(employeeId);
  const save = useSaveRegistryRow("hr_employee_identity_documents");
  const del = useDeleteRegistryRow("hr_employee_identity_documents");
  const [form, setForm] = useState(empty);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const add = () => {
    if (!form.number.trim()) return;
    save.mutate(
      {
        ...form,
        issuer: form.issuer || null,
        issuer_state: form.issuer_state || null,
        issue_date: form.issue_date || null,
        expiry_date: form.expiry_date || null,
        category: form.category || null,
        employee_id: employeeId,
        company_id: companyId,
      },
      { onSuccess: () => setForm(empty) },
    );
  };

  return (
    <div className="space-y-4 py-4">
      {docs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento de identificação cadastrado.</p>}
      <div className="space-y-2">
        {docs.map((d) => {
          const validity = d.expiry_date ? statusFromExpiry(d.expiry_date) : null;
          return (
            <div key={d.id} className="flex items-start gap-2 border rounded-md p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{optionLabel(IDENTITY_DOC_TYPES, d.doc_type)}</p>
                <p className="text-xs text-muted-foreground">
                  <MaskedField value={d.number} employeeId={employeeId} companyId={companyId} fieldName={d.doc_type} />
                  {d.issuer ? ` · ${d.issuer}` : ""}
                  {d.issuer_state ? `/${d.issuer_state}` : ""}
                  {d.category ? ` · cat. ${d.category}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {d.issue_date ? `Emissão: ${formatLocalDate(d.issue_date)}` : ""}
                  {d.expiry_date ? ` · Validade: ${formatLocalDate(d.expiry_date)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">{optionLabel(IDENTITY_DOC_STATUS, d.status)}</Badge>
                {validity && validity.status !== "none" && (
                  <Badge
                    variant={validity.status === "expired" ? "destructive" : validity.status === "expiring" ? "outline" : "secondary"}
                    className="text-xs"
                  >
                    {validity.status === "expired"
                      ? "Vencido"
                      : validity.status === "expiring"
                      ? `Vence em ${validity.daysLeft}d`
                      : "Vigente"}
                  </Badge>
                )}

                {!d.verified && (
                  <Button size="sm" variant="outline" onClick={() => save.mutate({ id: d.id, verified: true, verified_at: new Date().toISOString(), status: "valido" })}>
                    Validar
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => del.mutate(d.id)} aria-label="Remover documento">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border rounded-md p-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={form.doc_type} onValueChange={(v) => set("doc_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IDENTITY_DOC_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Número</Label>
            <Input value={form.number} onChange={(e) => set("number", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Órgão emissor</Label>
            <Input value={form.issuer} onChange={(e) => set("issuer", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">UF do órgão</Label>
            <Input maxLength={2} value={form.issuer_state} onChange={(e) => set("issuer_state", e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">Emissão</Label>
            <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Validade</Label>
            <Input type="date" value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
          </div>
          {form.doc_type === "cnh" && (
            <div>
              <Label className="text-xs">Categoria (CNH)</Label>
              <Input value={form.category} onChange={(e) => set("category", e.target.value.toUpperCase())} placeholder="Ex.: AB" />
            </div>
          )}
          <div>
            <Label className="text-xs">Situação</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {IDENTITY_DOC_STATUS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={add} disabled={save.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar documento
        </Button>
      </div>
    </div>
  );
}
