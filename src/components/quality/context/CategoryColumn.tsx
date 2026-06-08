import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ContextItemCard from "./ContextItemCard";
import type { ContextCategory, ContextItem } from "@/hooks/useQualityOrgContext";

interface Props {
  title: string;
  category: ContextCategory;
  items: ContextItem[];
  onAdd: (cat: ContextCategory) => void;
  onEdit: (item: ContextItem) => void;
  onRemove: (item: ContextItem) => void;
  onGenerateRisk: (item: ContextItem) => void;
  accent?: string;
}

const CategoryColumn = ({ title, category, items, onAdd, onEdit, onRemove, onGenerateRisk, accent }: Props) => {
  const list = items.filter(i => i.category === category);
  return (
    <div className="space-y-2">
      <div className={`flex items-center justify-between px-3 py-2 rounded-md ${accent ?? "bg-muted"}`}>
        <h4 className="text-sm font-semibold">{title} <span className="text-xs text-muted-foreground">({list.length})</span></h4>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onAdd(category)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum item</p>
        ) : (
          list.map(item => (
            <ContextItemCard key={item.id} item={item}
              onEdit={() => onEdit(item)}
              onRemove={() => onRemove(item)}
              onGenerateRisk={() => onGenerateRisk(item)} />
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryColumn;
