import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2, Star, Phone, Mail, MessageCircle } from "lucide-react";
import { useClientContacts, ClientContact, ClientContactInsert } from "@/hooks/useClientContacts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ContactsFormProps {
  clientId: string | null;
}

interface ContactFormData {
  name: string;
  role: string;
  email: string;
  phone: string;
  whatsapp: string;
}

const emptyForm: ContactFormData = {
  name: "",
  role: "",
  email: "",
  phone: "",
  whatsapp: "",
};

export const ContactsForm = ({ clientId }: ContactsFormProps) => {
  const { contacts, isLoading, createContact, updateContact, deleteContact, setPrimaryContact } = useClientContacts(clientId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<ClientContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);

  const handleOpenDialog = (contact?: ClientContact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        role: contact.role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        whatsapp: contact.whatsapp || "",
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

  const handleSubmit = async () => {
    if (!clientId || !formData.name.trim()) return;

    if (editingContact) {
      await updateContact.mutateAsync({
        id: editingContact.id,
        name: formData.name.trim(),
        role: formData.role.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
      });
    } else {
      const newContact: ClientContactInsert = {
        client_id: clientId,
        name: formData.name.trim(),
        role: formData.role.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        is_primary: contacts.length === 0,
      };
      await createContact.mutateAsync(newContact);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!contactToDelete) return;
    await deleteContact.mutateAsync(contactToDelete.id);
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleSetPrimary = async (contact: ClientContact) => {
    if (contact.is_primary) return;
    await setPrimaryContact.mutateAsync(contact.id);
  };

  if (!clientId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Salve as informações da empresa primeiro para adicionar contatos.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => handleOpenDialog()} className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Novo Contato
      </Button>

      {contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum contato cadastrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    {contact.role && (
                      <p className="text-sm text-muted-foreground">{contact.role}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.whatsapp && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {contact.whatsapp}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!contact.is_primary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetPrimary(contact)}
                        title="Definir como principal"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(contact)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setContactToDelete(contact);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Editar Contato" : "Novo Contato"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do contato"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Cargo/Função</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Ex: Gerente de Operações"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 0000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || createContact.isPending || updateContact.isPending}
            >
              {editingContact ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o contato "{contactToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
