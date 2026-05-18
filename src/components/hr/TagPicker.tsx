import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Tag as TagIcon, X } from "lucide-react";
import { useApplicationTags, useTagAssignment } from "@/hooks/useRecruitment";

const TAG_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#64748b",
];

interface AssignedTag { id: string; name: string; color: string }

interface Props {
  applicationId: string;
  assignedTags: AssignedTag[];
}

const TagPicker = ({ applicationId, assignedTags }: Props) => {
  const { tags, createTag } = useApplicationTags();
  const { assignTag, removeTag } = useTagAssignment();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [color, setColor] = useState(TAG_COLORS[5]);

  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const filtered = tags.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()));
  const exactMatch = tags.some((t: any) => t.name.toLowerCase() === search.trim().toLowerCase());

  const handleCreateAndAssign = async () => {
    const name = search.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync({ name, color });
    if (tag?.id) await assignTag.mutateAsync({ applicationId, tagId: tag.id });
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {assignedTags.map((t) => (
          <Badge
            key={t.id}
            variant="outline"
            className="gap-1 pr-1"
            style={{ backgroundColor: `${t.color}20`, borderColor: t.color, color: t.color }}
          >
            {t.name}
            <button
              type="button"
              onClick={() => removeTag.mutate({ applicationId, tagId: t.id })}
              className="hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-6 gap-1 px-2">
              <Plus className="h-3 w-3" /> Marcação
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <Input
                autoFocus
                placeholder="Buscar ou criar marcação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="flex gap-1 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="h-5 w-5 rounded-full border-2 transition"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "hsl(var(--foreground))" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.map((t: any) => {
                  const isAssigned = assignedIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        isAssigned
                          ? removeTag.mutate({ applicationId, tagId: t.id })
                          : assignTag.mutate({ applicationId, tagId: t.id })
                      }
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </span>
                      {isAssigned && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
                {filtered.length === 0 && !search && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Nenhuma marcação. Digite para criar.
                  </p>
                )}
              </div>
              {search.trim() && !exactMatch && (
                <Button size="sm" className="w-full" onClick={handleCreateAndAssign}>
                  <TagIcon className="h-3 w-3 mr-1" />
                  Criar "{search.trim()}"
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TagPicker;
