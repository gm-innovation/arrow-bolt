import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SupervisorSelectionProps {
  form: any;
  supervisors: Array<{ id: string; full_name: string }>;
}

export const SupervisorSelection = ({ form, supervisors }: SupervisorSelectionProps) => {
  return (
    <FormField
      control={form.control}
      name="supervisorId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Supervisor</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o supervisor" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {supervisors.map((supervisor) => (
                <SelectItem key={supervisor.id} value={supervisor.id}>
                  {supervisor.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};