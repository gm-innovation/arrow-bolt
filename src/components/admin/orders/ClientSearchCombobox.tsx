import { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Crown, Link2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface ClientOption {
  id: string;
  name: string;
  parent_client_id: string | null;
  parent_name?: string;
  children_count?: number;
}

interface ClientSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  companyId: string;
  disabled?: boolean;
  placeholder?: string;
}

export const ClientSearchCombobox = ({
  value,
  onValueChange,
  companyId,
  disabled,
  placeholder = "Selecione o cliente",
}: ClientSearchComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load selected client label
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const loadLabel = async () => {
      const { data } = await supabase
        .from("clients")
        .select("name, parent_client_id")
        .eq("id", value)
        .single();
      if (data) setSelectedLabel(data.name);
    };
    loadLabel();
  }, [value]);

  // Search clients server-side
  const searchClients = useCallback(async (term: string) => {
    if (!companyId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("clients")
        .select("id, name, parent_client_id")
        .eq("company_id", companyId)
        .order("name")
        .limit(30);

      if (term.length >= 2) {
        query = query.ilike("name", `%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const clientList = data || [];
      const clientIds = clientList.map(c => c.id);

      // Get parent names for children
      const parentIds = [...new Set(clientList.filter(c => c.parent_client_id).map(c => c.parent_client_id!))];
      const parentMap: Record<string, string> = {};
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", parentIds);
        parents?.forEach(p => { parentMap[p.id] = p.name; });
      }

      // Count children for each client shown
      const { data: childCounts } = await supabase
        .from("clients")
        .select("parent_client_id")
        .eq("company_id", companyId)
        .in("parent_client_id", clientIds);

      const countMap: Record<string, number> = {};
      childCounts?.forEach(c => {
        if (c.parent_client_id) {
          countMap[c.parent_client_id] = (countMap[c.parent_client_id] || 0) + 1;
        }
      });

      const enriched: ClientOption[] = clientList.map(c => ({
        ...c,
        parent_name: c.parent_client_id ? parentMap[c.parent_client_id] : undefined,
        children_count: countMap[c.id] || 0,
      }));

      setClients(enriched);
    } catch (err) {
      console.error("Error searching clients:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (open) {
      searchClients(debouncedSearch);
    }
  }, [debouncedSearch, open, searchClients]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 h-8"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : clients.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {search.length < 2 ? "Digite ao menos 2 caracteres" : "Nenhum cliente encontrado"}
            </div>
          ) : (
            clients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  onValueChange(client.id);
                  setSelectedLabel(client.name);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  value === client.id && "bg-accent"
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0", value === client.id ? "opacity-100" : "opacity-0")} />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 w-full">
                    <span className="truncate">{client.name}</span>
                    {client.children_count > 0 && (
                      <Badge variant="info" size="sm" className="gap-0.5 shrink-0">
                        <Crown className="h-3 w-3" />
                        Grupo ({client.children_count})
                      </Badge>
                    )}
                    {client.parent_client_id && client.parent_name && (
                      <Badge variant="outline" size="sm" className="gap-0.5 shrink-0">
                        <Link2 className="h-3 w-3" />
                        {client.parent_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
