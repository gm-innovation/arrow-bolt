import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceCategories, type FinanceCategoryType } from "@/hooks/useFinanceSettings";

interface Props {
  type: FinanceCategoryType;
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const CategorySelect = ({ type, value, onChange, label = "Categoria" }: Props) => {
  const { categories } = useFinanceCategories(type);

  return (
    <div>
      <Label>{label}</Label>
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder="Sem categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem categoria</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categories.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Nenhuma categoria cadastrada. Configure em Financeiro &gt; Configurações.
        </p>
      )}
    </div>
  );
};

export default CategorySelect;
