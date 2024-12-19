import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SupervisorSelection = ({ form }: any) => {
  return (
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
  );
};

const mockSupervisors = [
  { id: "s1", name: "Paulo Supervisor" },
  { id: "s2", name: "Sandra Supervisora" },
];