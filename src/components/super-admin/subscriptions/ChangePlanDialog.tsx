import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const formSchema = z.object({
  plan: z.enum(["basic", "professional", "enterprise"], {
    required_error: "Selecione um plano",
  }),
});

interface ChangePlanDialogProps {
  subscription: {
    id: string;
    company_name: string;
    subscription_plan: 'basic' | 'professional' | 'enterprise' | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePlanDialog({
  subscription,
  open,
  onOpenChange,
}: ChangePlanDialogProps) {
  const { updatePlan } = useSubscriptions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      plan: "basic",
    },
  });

  useEffect(() => {
    if (subscription?.subscription_plan) {
      form.reset({
        plan: subscription.subscription_plan,
      });
    }
  }, [subscription, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!subscription) return;

    const result = await updatePlan(subscription.id, values.plan);
    if (result.success) {
      onOpenChange(false);
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case "basic":
        return "R$ 99/mês";
      case "professional":
        return "R$ 199/mês";
      case "enterprise":
        return "R$ 499/mês";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Plano de Assinatura</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Empresa: <span className="font-medium text-foreground">{subscription?.company_name}</span>
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Plano</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">
                        <div className="flex flex-col">
                          <span className="font-medium">Basic</span>
                          <span className="text-xs text-muted-foreground">
                            {getPlanPrice("basic")}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="professional">
                        <div className="flex flex-col">
                          <span className="font-medium">Professional</span>
                          <span className="text-xs text-muted-foreground">
                            {getPlanPrice("professional")}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="enterprise">
                        <div className="flex flex-col">
                          <span className="font-medium">Enterprise</span>
                          <span className="text-xs text-muted-foreground">
                            {getPlanPrice("enterprise")}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Alterar Plano</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
