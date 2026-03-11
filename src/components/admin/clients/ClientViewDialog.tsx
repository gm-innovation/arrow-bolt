import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, Ship, MapPin, Building2, Star, User, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export const ClientViewDialog = ({ open, onOpenChange, client }: Props) => {
  // Fetch child clients for this parent
  const { data: childClients = [] } = useQuery({
    queryKey: ["client-children", client?.id],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("parent_client_id", client!.id).order("name");
      return data || [];
    },
    enabled: !!client?.id && open,
  });

  const allGroupIds = client ? [client.id, ...childClients.map(c => c.id)] : [];
  const nameMap: Record<string, string> = {};
  if (client) {
    nameMap[client.id] = client.name;
    childClients.forEach(c => { nameMap[c.id] = c.name; });
  }

  const { data: legalEntities = [], isLoading: loadingLE } = useQuery({
    queryKey: ["client-legal-entities-group", allGroupIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("client_legal_entities").select("*").in("client_id", allGroupIds).order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: allGroupIds.length > 0 && open,
  });

  const { data: addresses = [], isLoading: loadingAddr } = useQuery({
    queryKey: ["client-addresses-group", allGroupIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("client_addresses").select("*").in("client_id", allGroupIds).order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: allGroupIds.length > 0 && open,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["client-contacts-group", allGroupIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("client_contacts").select("*").in("client_id", allGroupIds).order("is_primary", { ascending: false });
      return data || [];
    },
    enabled: allGroupIds.length > 0 && open,
  });

  const { data: vessels = [] } = useQuery({
    queryKey: ["client-vessels-group", allGroupIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("vessels").select("id, name, vessel_type, client_id").in("client_id", allGroupIds).order("name");
      return data || [];
    },
    enabled: allGroupIds.length > 0 && open,
  });

  if (!client) return null;

  const hasGroup = childClients.length > 0;
  const SourceBadge = ({ clientId }: { clientId: string }) => {
    if (!hasGroup || clientId === client.id) return null;
    return <Badge variant="outline" className="text-xs ml-1">{nameMap[clientId] || "—"}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes do Cliente</SheetTitle>
          <SheetDescription>Visualização completa dos dados cadastrais{hasGroup ? ` (grupo com ${childClients.length} empresa${childClients.length > 1 ? "s" : ""} vinculada${childClients.length > 1 ? "s" : ""})` : ""}.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">{client.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{client.name}</p>
              <p className="text-sm text-muted-foreground">Nome Fantasia</p>
            </div>
          </div>

          {client.email && <p className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</p>}
          {client.phone && <p className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</p>}

          {hasGroup && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Empresas do Grupo</h3>
                <div className="flex flex-wrap gap-1">
                  {childClients.map(c => (
                    <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Legal Entities */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="h-4 w-4" /> Razões Sociais</h3>
            {loadingLE ? <Skeleton className="h-12 w-full" /> : legalEntities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{client.cnpj ? `CNPJ: ${client.cnpj}` : "Nenhuma razão social cadastrada"}</p>
            ) : (
              <div className="space-y-2">
                {legalEntities.map((le: any) => (
                  <Card key={le.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{le.legal_name}</span>
                        {le.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-current" />Principal</Badge>}
                        <SourceBadge clientId={le.client_id} />
                      </div>
                      {le.cnpj && <p className="text-xs text-muted-foreground">{le.cnpj}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Addresses */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4" /> Endereços</h3>
            {loadingAddr ? <Skeleton className="h-12 w-full" /> : addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{client.address || "Nenhum endereço cadastrado"}</p>
            ) : (
              <div className="space-y-2">
                {addresses.map((a: any) => (
                  <Card key={a.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{a.label || "Endereço"}</span>
                        {a.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-current" />Principal</Badge>}
                        <SourceBadge clientId={a.client_id} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[a.street, a.street_number, a.complement, a.city, a.state].filter(Boolean).join(", ")}
                      </p>
                      {a.cep && <p className="text-xs text-muted-foreground">CEP: {a.cep}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Contacts */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><User className="h-4 w-4" /> Contatos</h3>
            {loadingContacts ? <Skeleton className="h-12 w-full" /> : contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{client.contact_person || "Nenhum contato cadastrado"}</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.name}</span>
                        {c.is_primary && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                        {c.is_general && <Badge variant="outline" className="text-xs">Geral</Badge>}
                        <SourceBadge clientId={c.client_id} />
                      </div>
                      {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {c.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{c.whatsapp}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Vessels */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Ship className="h-4 w-4" /> Embarcações</h3>
            {vessels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma embarcação cadastrada</p>
            ) : (
              <div className="space-y-2">
                {vessels.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <span className="font-medium text-sm">{v.name}</span>
                      {v.vessel_type && <span className="text-xs text-muted-foreground">({v.vessel_type})</span>}
                      <SourceBadge clientId={v.client_id} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
