import { LayoutList, LayoutKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ViewToggleProps {
  view: "list" | "kanban";
  onViewChange: (view: "list" | "kanban") => void;
}

export const ViewToggle = ({ view, onViewChange }: ViewToggleProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant={view === "list" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewChange("list")}
      >
        <LayoutList className="h-4 w-4 mr-2" />
        Lista
      </Button>
      <Button
        variant={view === "kanban" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewChange("kanban")}
      >
        <LayoutKanban className="h-4 w-4 mr-2" />
        Kanban
      </Button>
    </div>
  );
};