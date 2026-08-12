import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useEmployeeAddresses, useSaveRegistryRow, useDeleteRegistryRow } from "@/hooks/useEmployeeRegistry";
import { ADDRESS_KIND_OPTIONS, formatZip, optionLabel, parseAddress } from "@/lib/hr/employeeRegistry";

const empty = {
  kind: "residencial",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  zip_code: "",
  raw_address: "",
  is_primary: true,
};

/** Endereços do colaborador, preservando o texto original quando importado. */
export function AddressTab({ employeeId, companyId }: { employeeId: string; companyId: string }) {
  const { data: addresses = [] } = useEmployeeAddresses(employeeId);
  const save = useSaveRegistryRow("hr_employee_addresses");
  const del = useDeleteRegistryRow("hr_employee_addresses");
  const [form, setForm] = useState(empty);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const fillFromRaw = () => {
    const parsed = parseAddress(form.raw_address);
    setForm((f) => ({
      ...f,
      street: parsed.street ?? f.street,
      number: parsed.number ?? f.number,
      district: parsed.district ?? f.district,
      city: parsed.city ?? f.city,
      state: parsed.state ?? f.state,
      zip_code: parsed.zip_code ?? f.zip_code,
    }));
  };

  const add = () => {
    if (!form.street && !form.raw_address) return;
    save.mutate(
      {
        ...form,
        zip_code: form.zip_code ? formatZip(form.zip_code) : null,
        raw_address: form.raw_address || null,
        employee_id: employeeId,
        company_id: companyId,
      },
      { onSuccess: () => setForm(empty) },
    );
  };

  return (
    <div className="space-y-4 py-4">
      {addresses.length === 0 && <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>}
      <div className="space-y-2">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start gap-2 border rounded-md p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {[a.street, a.number].filter(Boolean).join(", ") || a.raw_address || "Endereço"}
              </p>
              <p className="text-xs text-muted-foreground">
                {[a.complement, a.district, a.city, a.state, a.zip_code, a.country].filter(Boolean).join(" · ")}
              </p>
              {a.raw_address && (
                <p className="text-[11px] text-muted-foreground mt-1">Original: {a.raw_address}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">{optionLabel(ADDRESS_KIND_OPTIONS, a.kind)}</Badge>
              {a.is_primary && <Badge className="text-xs">Principal</Badge>}
              <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)} aria-label="Remover endereço">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded-md p-3 space-y-3">
        <div>
          <Label className="text-xs">Endereço em texto livre (opcional)</Label>
          <div className="flex gap-2">
            <Input value={form.raw_address} onChange={(e) => set("raw_address", e.target.value)} placeholder="Rua X, 100, Bairro, Cidade - RJ, 20000-000" />
            <Button type="button" variant="outline" onClick={fillFromRaw}>Separar</Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Logradouro</Label>
            <Input value={form.street} onChange={(e) => set("street", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Número</Label>
            <Input value={form.number} onChange={(e) => set("number", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Complemento</Label>
            <Input value={form.complement} onChange={(e) => set("complement", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Bairro</Label>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">UF</Label>
            <Input maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} />
          </div>
          <div>
            <Label className="text-xs">CEP</Label>
            <Input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} placeholder="00000-000" />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ADDRESS_KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={add} disabled={save.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar endereço
        </Button>
      </div>
    </div>
  );
}
