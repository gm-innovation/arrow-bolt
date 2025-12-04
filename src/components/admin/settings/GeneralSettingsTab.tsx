import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMeasurementSettings } from "@/hooks/useMeasurementSettings";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const settingsSchema = z.object({
  km_rate: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  default_material_markup: z.number().min(0).max(100),
  expense_admin_fee: z.number().min(0).max(100),
  tax_laboratorio: z.number().min(0).max(100),
  tax_externo: z.number().min(0).max(100),
});

export const GeneralSettingsTab = () => {
  const { settings, isLoading, updateSettings } = useMeasurementSettings();

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      km_rate: 2.50,
      default_material_markup: 30.00,
      expense_admin_fee: 20.00,
      tax_laboratorio: 5.00,
      tax_externo: 2.00,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        km_rate: Number(settings.km_rate),
        default_material_markup: Number(settings.default_material_markup),
        expense_admin_fee: Number(settings.expense_admin_fee),
        tax_laboratorio: Number(settings.tax_laboratorio),
        tax_externo: Number(settings.tax_externo),
      });
    }
  }, [settings]);

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    await updateSettings.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Deslocamento</h3>
          <FormField
            control={form.control}
            name="km_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa por Quilômetro (R$/km)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Valor cobrado por quilômetro rodado em deslocamentos com carro próprio
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Materiais</h3>
          <FormField
            control={form.control}
            name="default_material_markup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Markup Padrão (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Percentual padrão aplicado sobre o custo dos materiais
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Despesas</h3>
          <FormField
            control={form.control}
            name="expense_admin_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa Administrativa (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Percentual aplicado sobre despesas (hospedagem, alimentação)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Impostos por Categoria</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="tax_laboratorio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LABORATÓRIO (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Taxa de imposto para serviços da categoria LABORATÓRIO
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="tax_externo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EXTERNO (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Taxa de imposto para serviços da categoria EXTERNO
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </Form>
  );
};