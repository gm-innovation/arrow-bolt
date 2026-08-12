import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  useEmployeeContacts,
  useEmergencyContacts,
  useSaveRegistryRow,
  useDeleteRegistryRow,
} from "@/hooks/useEmployeeRegistry";
import {
  CONTACT_CATEGORY_OPTIONS,
  CONTACT_KIND_OPTIONS,
  optionLabel,
} from "@/lib/hr/employeeRegistry";

interface Props {
  employeeId: string;
  companyId: string;
}

/** Contatos múltiplos + contatos de emergência. */
export function ContactsTab({ employeeId, companyId }: Props) {
  const { data: contacts = [] } = useEmployeeContacts(employeeId);
  const { data: emergency = [] } = useEmergencyContacts(employeeId);
  const saveContact = useSaveRegistryRow("hr_employee_contacts");
  const delContact = useDeleteRegistryRow("hr_employee_contacts");
  const saveEmergency = useSaveRegistryRow("hr_emergency_contacts");
  const delEmergency = useDeleteRegistryRow("hr_emergency_contacts");

  const [newContact, setNewContact] = useState({ kind: "celular", category: "pessoal", value: "", is_primary: false });
  const [newEmergency, setNewEmergency] = useState({ name: "", relationship: "", phone: "", alt_phone: "", email: "", is_primary: false });

  const addContact = () => {
    if (!newContact.value.trim()) return;
    saveContact.mutate(
      { ...newContact, employee_id: employeeId, company_id: companyId },
      { onSuccess: () => setNewContact({ kind: "celular", category: "pessoal", value: "", is_primary: false }) },
    );
  };

  const addEmergency = () => {
    if (!newEmergency.name.trim() || !newEmergency.phone.trim()) return;
    saveEmergency.mutate(
      {
        ...newEmergency,
        relationship: newEmergency.relationship || null,
        alt_phone: newEmergency.alt_phone || null,
        email: newEmergency.email || null,
        employee_id: employeeId,
        company_id: companyId,
      },
      { onSuccess: () => setNewEmergency({ name: "", relationship: "", phone: "", alt_phone: "", email: "", is_primary: false }) },
    );
  };

  return (
    <div className="space-y-6 py-4">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Contatos</h3>
        {contacts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>}
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border rounded-md p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.value}</p>
                <p className="text-xs text-muted-foreground">
                  {optionLabel(CONTACT_KIND_OPTIONS, c.kind)} · {optionLabel(CONTACT_CATEGORY_OPTIONS, c.category)}
                </p>
              </div>
              {c.is_primary && <Badge variant="secondary" className="text-xs">Principal</Badge>}
              {c.verified && <Badge className="text-xs">Verificado</Badge>}
              {!c.verified && (
                <Button size="sm" variant="outline" onClick={() => saveContact.mutate({ id: c.id, verified: true, verified_at: new Date().toISOString() })}>
                  Verificar
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={() => delContact.mutate(c.id)} aria-label="Remover contato">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border rounded-md p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={newContact.kind} onValueChange={(v) => setNewContact((s) => ({ ...s, kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={newContact.category} onValueChange={(v) => setNewContact((s) => ({ ...s, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor</Label>
              <Input value={newContact.value} onChange={(e) => setNewContact((s) => ({ ...s, value: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={newContact.is_primary} onCheckedChange={(v) => setNewContact((s) => ({ ...s, is_primary: !!v }))} />
              Principal
            </label>
            <Button size="sm" onClick={addContact} disabled={saveContact.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar contato
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Contatos de emergência</h3>
        {emergency.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato de emergência cadastrado.</p>}
        <div className="space-y-2">
          {emergency.map((c) => (
            <div key={c.id} className="flex items-center gap-2 border rounded-md p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.relationship, c.phone, c.alt_phone, c.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              {c.is_primary && <Badge variant="secondary" className="text-xs">Principal</Badge>}
              <Button size="icon" variant="ghost" onClick={() => delEmergency.mutate(c.id)} aria-label="Remover contato de emergência">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border rounded-md p-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={newEmergency.name} onChange={(e) => setNewEmergency((s) => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Relação</Label>
              <Input value={newEmergency.relationship} onChange={(e) => setNewEmergency((s) => ({ ...s, relationship: e.target.value }))} placeholder="Ex.: cônjuge" />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input value={newEmergency.phone} onChange={(e) => setNewEmergency((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Telefone alternativo</Label>
              <Input value={newEmergency.alt_phone} onChange={(e) => setNewEmergency((s) => ({ ...s, alt_phone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">E-mail</Label>
              <Input value={newEmergency.email} onChange={(e) => setNewEmergency((s) => ({ ...s, email: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs">
              <Checkbox checked={newEmergency.is_primary} onCheckedChange={(v) => setNewEmergency((s) => ({ ...s, is_primary: !!v }))} />
              Principal
            </label>
            <Button size="sm" onClick={addEmergency} disabled={saveEmergency.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar contato de emergência
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
