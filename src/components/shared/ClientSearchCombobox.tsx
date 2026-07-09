import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Link2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";

interface ClientOption {
  id: string;
  name: string;
  parent_client_id: string | null;
  parent_name?: string;
}

interface ClientOptionRow {
  id: string;
  name: string;
  parent_client_id: string | null;
}

interface ClientLabelRow {
  name: string;
}

type QueryResult<T> = {
  data: T[] | null;
  error: Error | null;
};

type SingleQueryResult<T> = {
  data: T | null;
  error: Error | null;
};

interface ClientSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  companyId?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const ClientSearchCombobox = ({
  value,
  onValueChange,
  companyId: companyIdProp,
  disabled,
  placeholder = "Selecione o cliente",
  className,
}: ClientSearchComboboxProps) => {
  const { profile } = useAuth();
  const companyId = companyIdProp || profile?.company_id;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const loadLabel = async () => {
      const { data } = await supabase
        .from("crm_client_options" as never)
        .select("name")
        .eq("id", value)
        .maybeSingle() as SingleQueryResult<ClientLabelRow>;
      if (data) setSelectedLabel(data.name);
    };
    loadLabel();
  }, [value]);

  const searchClients = useCallback(async (term: string) => {
    if (!companyId) return;
    const normalizedTerm = term.trim();
    const requestId = ++requestIdRef.current;

    if (normalizedTerm.length === 1) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("crm_client_options" as never)
        .select("id, name, parent_client_id")
        .eq("company_id", companyId)
        .order("name")
        .limit(20);

      if (normalizedTerm.length >= 2) {
        query = query.ilike("name", `%${normalizedTerm}%`);
      }

      const { data, error } = await query as QueryResult<ClientOptionRow>;
      if (error) throw error;
      if (requestId !== requestIdRef.current) return;

      const clientList = data || [];
      const parentIds = [...new Set(clientList.filter((c) => c.parent_client_id).map((c) => c.parent_client_id as string))];
      const parentMap: Record<string, string> = {};
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from("crm_client_options" as never)
          .select("id, name")
          .in("id", parentIds) as QueryResult<ClientLabelRow & { id: string }>;
        if (requestId !== requestIdRef.current) return;
        parents?.forEach((p) => { parentMap[p.id] = p.name; });
      }

      const enriched: ClientOption[] = clientList.map((c) => ({
        ...c,
        parent_name: c.parent_client_id ? parentMap[c.parent_client_id] : undefined,
      }));

      setClients(enriched);
    } catch (err) {
      console.error("Error searching clients:", err);
      if (requestId === requestIdRef.current) setClients([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
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
      setClients([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") setOpen(true);
        }}
        className={cn("w-full justify-between font-normal", className)}
      >
        <span className="truncate">{selectedLabel || placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
      <div
        role="listbox"
        className="absolute left-0 right-0 top-full z-[100] mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
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
                type="button"
                key={client.id}
                role="option"
                aria-selected={value === client.id}
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
      </div>
      )}
    </div>
  );
};
