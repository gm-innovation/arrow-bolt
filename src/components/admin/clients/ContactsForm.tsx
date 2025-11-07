import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  role: z.string()
    .trim()
    .min(2, "Cargo deve ter pelo menos 2 caracteres")
    .max(100, "Cargo deve ter no máximo 100 caracteres"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres"),
  phone: z.string()
    .trim()
    .min(10, "Telefone deve ter pelo menos 10 caracteres")
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .regex(/^[\d\s\(\)\-\+]+$/, "Telefone contém caracteres inválidos"),
  whatsapp: z.string()
    .trim()
    .min(10, "WhatsApp deve ter pelo menos 10 caracteres")
    .max(20, "WhatsApp deve ter no máximo 20 caracteres")
    .regex(/^[\d\s\(\)\-\+]+$/, "WhatsApp contém caracteres inválidos"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export const ContactsForm = () => {
  const { toast } = useToast();
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      role: "",
      email: "",
      phone: "",
      whatsapp: "",
    },
  });

  const onSubmit = (data: ContactFormData) => {
    // Sanitize data before processing
    const sanitizedData = {
      name: data.name.trim(),
      role: data.role.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      whatsapp: data.whatsapp.trim(),
    };
    
    console.log(sanitizedData);
    toast({
      title: "Contato adicionado com sucesso!",
      description: "As informações foram salvas.",
    });
    form.reset();
  };

  return (
    <div className="space-y-4">
      <Button variant="outline" className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Novo Contato
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contato</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo/Função</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">Adicionar Contato</Button>
        </form>
      </Form>
    </div>
  );
};