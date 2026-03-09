import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2, Star, Phone, Mail, MessageCircle, Ship } from "lucide-react";
import { useClientContacts, ClientContact, ClientContactInsert } from "@/hooks/useClientContacts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactsFormProps {
  clientId: string | null;
}

interface ContactFormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
  is_general: boolean;
  vessel_ids: string[];
}

const emptyForm: ContactFormData = {
  name: "", role: "", email: "", phone: "", whatsapp: "", is_general: true, vessel_ids: [],
};

export const ContactsForm = ({ clientId }: ContactsFormProps) => {
  const { contacts, isLoading, createContact, updateContact, deleteContact, setPrimaryContact } = useClientContacts(clientId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<ClientContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);

  // Fetch vessels for this client
  const { data: vessels = [] } = useQuery({
    queryKey: ["client-vessels", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("vessels").select("id, name").eq("client_id", clientId!).order("name");
      return data || [];
    },
    enabled: !!clientId,
  });

  // Fetch vessel links for a contact
  const fetchVesselLinks = async (contactId: string) => {
    const { data } = await supabase.from("contact_vessel_links").select("vessel_id").eq("contact_id", contactId);
    return (data || []).map((d: any) => d.vessel_id);
  };

  const handleOpenDialog = async (contact?: ClientContact) => {
    if (contact) {
      setEditingContact(contact);
      const vesselIds = await fetchVesselLinks(contact.id);
      setFormData({
        name: contact.name,
        role: contact.role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        whatsapp: contact.whatsapp || "",
        is_general: (contact as any).is_general ?? true,
        vessel_ids: vesselIds,
      });
    } else {
      setEditingContact(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingContact(null);
    setFormData(emptyForm);
  };

  const saveVesselLinks = async (contactId: string, vesselIds: string[]) => {
    // Delete existing links
    await supabase.from("contact_vessel_links").delete().eq("contact_id", contactId);
    // Insert new links
    if (vesselIds.length > 0) {
      await supabase.from("contact_vessel_links").insert(
        vesselIds.map(vessel_id => ({ contact_id: contactId, vessel_id })) as any
      );
    }
  };

  const handleSubmit = async () => {
    if (!clientId || !formData.name.trim()) return;

    const contactData = {
      name: formData.name.trim(),
      role: formData.role.trim() || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      whatsapp: formData.whatsapp.trim() || null,
    };

    if (editingContact) {
      await updateContact.mutateAsync({ id: editingContact.id, ...contactData });
      // Update is_general via direct call since hook might not support it
      await supabase.from("client_contacts").update({ is_general: formData.is_general } as any).eq("id", editingContact.id);
      await saveVesselLinks(editingContact.id, formData.is_general ? [] : formData.vessel_ids);
    } else {
      const newContact: ClientContactInsert = {
        client_id: clientId,
        ...contactData,
        is_primary: contacts.length === 0,
      };
      const result = await createContact.mutateAsync(newContact);
      if (result?.id) {
        await supabase.from("client_contacts").update({ is_general: formData.is_general } as any).eq("id", result.id);
        if (!formData.is_general) {
          await saveVesselLinks(result.id, formData.vessel_ids);
        }
      }
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    await deleteContact.mutateAsync(contactToDelete.id);
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const toggleVessel = (vesselId: string) => {
    setFormData(prev => ({
      ...prev,
      vessel_ids: prev.vessel_ids.includes(vesselId)
        ? prev.vessel_ids.filter(id => id !== vesselId)
        : [...prev.vessel_ids, vesselId],
    }));
  };

  if (!clientId) {
    return <div className="text-center py-8 text-muted-foreground">Salve as informações da empresa primeiro para adicionar contatos.</div>;
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => handleOpenDialog()} className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Contato
      </Button>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum contato cadastrado ainda.</div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-current" />Principal</Badge>
                      )}
                      {(contact as any).is_general ? (
                        <Badge variant="outline" className="text-xs">Geral</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs"><Ship className="h-3 w-3 mr-1" />Embarcações</Badge>
                      )}
                    </div>
                    {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                      {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                      {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
                      {contact.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{contact.whatsapp}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!contact.is_primary && (
                      <Button variant="ghost" size="icon" onClick={() => setPrimaryContact.mutate(contact.id)} title="Definir como principal">
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(contact)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setContactToDelete(contact); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Nome do contato" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo/Função</Label>
              <Input id="role" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="Ex: Gerente de Operações" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={formData.whatsapp} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} />
            </div>

            {/* Vessel association */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_general"
                  checked={formData.is_general}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_general: !!checked, vessel_ids: checked ? [] : formData.vessel_ids })}
                />
                <Label htmlFor="is_general" className="text-sm">Contato geral (sem vínculo a embarcações específicas)</Label>
              </div>

              {!formData.is_general && vessels.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Embarcações vinculadas</Label>
                  <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                    {vessels.map((v: any) => (
                      <div key={v.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`vessel-${v.id}`}
                          checked={formData.vessel_ids.includes(v.id)}
                          onCheckedChange={() => toggleVessel(v.id)}
                        />
                        <Label htmlFor={`vessel-${v.id}`} className="text-sm font-normal">{v.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!formData.is_general && vessels.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma embarcação cadastrada para este cliente.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim() || createContact.isPending || updateContact.isPending}>
              {editingContact ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o contato "{contactToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
