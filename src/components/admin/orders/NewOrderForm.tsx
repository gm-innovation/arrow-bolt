import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { OrderBasicInfo } from "./OrderBasicInfo";
import { ServiceDetails } from "./ServiceDetails";
import { TechniciansSelection } from "./TechniciansSelection";
import { SupervisorSelection } from "./SupervisorSelection";
import { Input } from "@/components/ui/input";

type OrderFormData = {
  orderNumber: string;
  clientId: string;
  vesselId: string;
  contactId: string;
  serviceDateTime: string;
  location: string;
  access: string;
  taskTypes: string[];
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
        <div className="space-y-6">
          <OrderBasicInfo 
            form={form} 
            client={client} 
            onClientChange={setSelectedClient} 
          />
          
          <ServiceDetails form={form} />
          
          <TechniciansSelection
            selectedTechnicians={selectedTechnicians}
            onTechnicianToggle={handleTechnicianToggle}
            leadTechId={leadTechId}
            onLeadTechChange={handleLeadTechChange}
          />
          
          <SupervisorSelection form={form} />

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
        </div>
      </form>
    </Form>
  );
};

// Mock data moved to respective components
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