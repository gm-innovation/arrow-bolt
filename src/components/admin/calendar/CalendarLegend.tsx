import { cn } from "@/lib/utils";
import {
  CALENDAR_CATEGORIES,
  categoryStyles,
  type CalendarCategory,
} from "./eventStyles";

interface CalendarLegendProps {
  activeCategories?: CalendarCategory[];
  onToggleCategory?: (category: CalendarCategory) => void;
}

export const CalendarLegend = ({ activeCategories, onToggleCategory }: CalendarLegendProps) => {
  const isActive = (category: CalendarCategory) =>
    !activeCategories || activeCategories.includes(category);

  return (
    <div className="flex flex-wrap gap-2 mb-3 px-2">
      {CALENDAR_CATEGORIES.map((category) => {
        const { label, badge, icon: Icon } = categoryStyles[category];
        const active = isActive(category);

        return (
          <button
            key={category}
            type="button"
            aria-pressed={active}
            title={onToggleCategory ? `Mostrar/ocultar ${label}` : label}
            onClick={() => onToggleCategory?.(category)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-all",
              badge,
              onToggleCategory && "cursor-pointer hover:shadow-sm",
              !onToggleCategory && "cursor-default",
              !active && "opacity-40 grayscale",
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}
    </div>
  );
};
