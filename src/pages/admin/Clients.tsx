
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Edit, Phone, Mail, Ship, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewClientForm } from "@/components/admin/clients/NewClientForm";
import { ClientHistoryDialog } from "@/components/admin/clients/ClientHistoryDialog";
import { useState } from "react";

// Mock data for demonstration
const mockClients = [
  {
    id: 1,
    name: "Petrobras S.A.",
    email: "contato@petrobras.com.br",
    phone: "(21) 3224-4477",
    contacts: [
      { name: "João Silva", role: "Gerente de Operações" },
      { name: "Maria Santos", role: "Coordenadora" },
    ],
    vessels: [
      { name: "PB-001", type: "PLSV" },
      { name: "PB-002", type: "PSV" },
    ],
  },
  {
    id: 2,
    name: "Shell Brasil",
    email: "contato@shell.com.br",
    phone: "(21) 3224-1234",
    contacts: [
      { name: "Pedro Costa", role: "Supervisor" },
    ],
    vessels: [
      { name: "SH-001", type: "AHTS" },
    ],
  },
];

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<{ id: string; name: string } | null>(null);

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
            </DialogHeader>
            <NewClientForm />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input 
              placeholder="Buscar clientes..." 
              className="max-w-sm"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-navy-light p-2 rounded-full">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{client.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedClientForHistory({ id: client.id.toString(), name: client.name });
                      setHistoryDialogOpen(true);
                    }}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Histórico
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setSelectedClient(client)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Editar Cliente - {client.name}</DialogTitle>
                      </DialogHeader>
                      <NewClientForm />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedClientForHistory && (
        <ClientHistoryDialog
          clientId={selectedClientForHistory.id}
          clientName={selectedClientForHistory.name}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}
    </div>
  );
};

export default Clients;
