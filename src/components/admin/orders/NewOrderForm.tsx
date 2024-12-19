import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

// Mock data - replace with real data later
const mockClients = [
  {
    id: "1",
    name: "Petrobras",
    vessels: [
      { id: "v1", name: "PB-001", type: "PLSV" },
      { id: "v2", name: "PB-002", type: "PSV" },
    ],
    contacts: [
      { id: "c1", name: "João Silva", role: "Gerente" },
      { id: "c2", name: "Maria Santos", role: "Coordenadora" },
    ],
  },
];

const mockTechnicians = [
  { id: "t1", name: "Carlos Oliveira" },
  { id: "t2", name: "Ana Paula" },
  { id: "t3", name: "Roberto Santos" },
];

const mockSupervisors = [
  { id: "s1", name: "Paulo Supervisor" },
  { id: "s2", name: "Sandra Supervisora" },
];

const mockTaskTypes = [
  { id: "tt1", name: "Manutenção Preventiva" },
  { id: "tt2", name: "Reparo" },
  { id: "tt3", name: "Inspeção" },
];

type OrderFormData = {
  orderNumber: string;
  clientId: string;
  vesselId: string;
  contactId: string;
  serviceDateTime: string;
  location: string;
  access: string;
  taskTypes: string[];
  technicians: string[];
  supervisorId: string;
  scope: string;
};

export const NewOrderForm = () => {
  const { toast } = useToast();
  const form = useForm<OrderFormData>();
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [leadTechId, setLeadTechId] = useState<string>("");

  const client = mockClients.find((c) => c.id === selectedClient);

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechnicians((prev) => {
      if (prev.includes(techId)) {
        return prev.filter((id) => id !== techId);
      } else {
        if (prev.length === 0) {
          setLeadTechId(techId);
        }
        return [...prev, techId];
      }
    });
  };

  const handleLeadTechChange = (techId: string) => {
    setLeadTechId(techId);
  };

  const onSubmit = (data: OrderFormData) => {
    const formData = {
      ...data,
      technicians: selectedTechnicians.map(techId => ({
        id: techId,
        isLead: techId === leadTechId
      }))
    };
    
    console.log(formData);
    toast({
      title: "Ordem de Serviço criada",
      description: "OS criada com sucesso!",
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número da OS</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedClient(value);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {client && (
          <>
            <FormField
              control={form.control}
              name="vesselId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Embarcação</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a embarcação" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {client.vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.name} - {vessel.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Solicitante</FormLabel>
                  <Select onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o solicitante" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {client.contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} - {contact.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="serviceDateTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data e Hora do Serviço</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Localização da embarcação" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="access"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Acesso</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Informações de acesso" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taskTypes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipos de Tarefa</FormLabel>
              <Select onValueChange={(value) => field.onChange([value])}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de tarefa" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockTaskTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormLabel>Técnicos</FormLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-lg p-4">
            {mockTechnicians.map((tech) => (
              <div key={tech.id} className="flex items-center space-x-4">
                <Checkbox
                  checked={selectedTechnicians.includes(tech.id)}
                  onCheckedChange={() => handleTechnicianToggle(tech.id)}
                />
                <span>{tech.name}</span>
                {selectedTechnicians.includes(tech.id) && (
                  <Checkbox
                    checked={leadTechId === tech.id}
                    onCheckedChange={() => handleLeadTechChange(tech.id)}
                  />
                )}
                {selectedTechnicians.includes(tech.id) && (
                  <span className="text-sm text-muted-foreground">
                    {leadTechId === tech.id ? "Responsável" : "Auxiliar"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="supervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supervisor</FormLabel>
              <Select onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o supervisor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockSupervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Escopo do Projeto</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Descreva o escopo do projeto"
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Criar Ordem de Serviço
        </Button>
      </form>
    </Form>
  );
};