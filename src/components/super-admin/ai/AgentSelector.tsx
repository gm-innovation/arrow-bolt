import { AIAgent } from "@/hooks/useAIAgents";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  agents: AIAgent[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete?: (id: string) => void;
}

export function AgentSelector({ agents, selectedId, onSelect, onCreate, onDelete }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agentes</h3>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus className="h-3 w-3 mr-1" /> Novo
        </Button>
      </div>
      <div className="space-y-2">
        {agents.map((a) => (
          <Card
            key={a.id}
            className={cn(
              "p-3 cursor-pointer hover:bg-accent transition-colors",
              selectedId === a.id && "border-primary bg-accent"
            )}
            onClick={() => onSelect(a.id)}
          >
            <div className="flex items-start gap-2">
              <Bot className="h-4 w-4 mt-0.5 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-medium text-sm truncate">{a.name}</span>
                  {a.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                  {!a.enabled && <Badge variant="outline" className="text-[10px]">Off</Badge>}
                  {a.company_id === null && <Badge className="text-[10px]">Global</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{a.description}</p>
              </div>
              {onDelete && !a.is_default && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Remover este agente?")) onDelete(a.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
