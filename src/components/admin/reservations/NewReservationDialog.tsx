import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plane, Moon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTechnicianReservations } from "@/hooks/useTechnicianReservations";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  technician_id: z.string().min(1, "Selecione um técnico"),
  start_date: z.date({ required_error: "Data de início é obrigatória" }),
  end_date: z.date({ required_error: "Data de fim é obrigatória" }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  client_id: z.string().optional(),
  vessel_id: z.string().optional(),
  reason: z.string().optional(),
  includes_travel: z.boolean().default(false),
  includes_overnight: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface NewReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTechnicianId?: string;
  preselectedDate?: Date;
}

export const NewReservationDialog = ({
  open,
  onOpenChange,
  preselectedTechnicianId,
  preselectedDate,
}: NewReservationDialogProps) => {
  const { user } = useAuth();
  const { createReservation } = useTechnicianReservations();
  const [technicians, setTechnicians] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [vessels, setVessels] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technician_id: preselectedTechnicianId || "",
      start_date: preselectedDate || new Date(),
      end_date: preselectedDate || new Date(),
      includes_travel: false,
      includes_overnight: false,
    },
  });

  useEffect(() => {
    if (preselectedTechnicianId) {
      form.setValue("technician_id", preselectedTechnicianId);
    }
    if (preselectedDate) {
      form.setValue("start_date", preselectedDate);
      form.setValue("end_date", preselectedDate);
    }
  }, [preselectedTechnicianId, preselectedDate, form]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch technicians
      const { data: techData } = await supabase
        .from("technicians")
        .select("id, profiles:user_id(full_name)")
        .eq("company_id", profile.company_id)
        .eq("active", true);

      setTechnicians(
        (techData || []).map((t: any) => ({
          id: t.id,
          name: t.profiles?.full_name || "Técnico",
        }))
      );

      // Fetch clients
      const { data: clientData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name");

      setClients(clientData || []);
    };

    if (open) {
      fetchData();
    }
  }, [open, user?.id]);

  // Fetch vessels when client changes
  useEffect(() => {
    const fetchVessels = async () => {
      if (!selectedClientId) {
        setVessels([]);
        return;
      }

      const { data } = await supabase
        .from("vessels")
        .select("id, name")
        .eq("client_id", selectedClientId)
        .order("name");

      setVessels(data || []);
    };

    fetchVessels();
  }, [selectedClientId]);

  const onSubmit = async (data: FormData) => {
    await createReservation.mutateAsync({
      technician_id: data.technician_id,
      start_date: format(data.start_date, "yyyy-MM-dd"),
      end_date: format(data.end_date, "yyyy-MM-dd"),
      start_time: data.start_time || undefined,
      end_time: data.end_time || undefined,
      client_id: data.client_id || undefined,
      vessel_id: data.vessel_id || undefined,
      reason: data.reason || undefined,
      includes_travel: data.includes_travel,
      includes_overnight: data.includes_overnight,
      notes: data.notes || undefined,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reserva de Técnico</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Technician */}
            <FormField
              control={form.control}
              name="technician_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Técnico *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um técnico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Início *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Fim *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", { locale: ptBR })
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          disabled={(date) => date < form.getValues("start_date")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time Range (optional) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Início</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário Fim</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Client & Vessel */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedClientId(value);
                      form.setValue("vessel_id", "");
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {vessels.length > 0 && (
              <FormField
                control={form.control}
                name="vessel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Embarcação (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma embarcação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vessels.map((vessel) => (
                          <SelectItem key={vessel.id} value={vessel.id}>
                            {vessel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da Reserva</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aguardando confirmação de serviço" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Flags */}
            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="includes_travel"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="flex items-center gap-1 font-normal cursor-pointer">
                      <Plane className="h-4 w-4" />
                      Inclui viagem
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includes_overnight"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="flex items-center gap-1 font-normal cursor-pointer">
                      <Moon className="h-4 w-4" />
                      Inclui pernoite
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createReservation.isPending}>
                {createReservation.isPending ? "Salvando..." : "Criar Reserva"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
