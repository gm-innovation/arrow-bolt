import { useMemo, useState } from "react";
import { useEmployeeHierarchy } from "@/hooks/useEmployeeHierarchy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Network } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  technician: "Técnico",
  coordinator: "Coordenador",
  hr: "RH",
  commercial: "Comercial",
  director: "Diretor",
  compras: "Suprimentos",
  qualidade: "Qualidade",
  financeiro: "Financeiro",
  super_admin: "Super Admin",
};

export const HierarchySettings = () => {
  const { data: employees, isLoading, updateManager, updatePosition } = useEmployeeHierarchy();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const list = employees ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.position ?? "").toLowerCase().includes(q) ||
        (e.department_name ?? "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  const managerMap = useMemo(() => {
    const m = new Map<string, string>();
    (employees ?? []).forEach((e) => m.set(e.id, e.full_name));
    return m;
  }, [employees]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Hierarquia de Gestores</CardTitle>
            <CardDescription>
              Defina o gestor direto de cada colaborador. Se vazio, o sistema usará o gestor do
              departamento como fallback. A hierarquia é usada para rotear aprovações de férias e
              solicitações.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="w-[200px]">Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="w-[280px]">Gestor direto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum colaborador encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="font-medium">{emp.full_name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground">{emp.email}</div>
                    </TableCell>
                    <TableCell>
                      {emp.role ? (
                        <Badge variant="outline">{ROLE_LABELS[emp.role] ?? emp.role}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PositionEditor
                        value={emp.position}
                        onSave={(position) =>
                          updatePosition.mutate({ employeeId: emp.id, position })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {emp.department_name ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <ManagerPicker
                        currentId={emp.direct_manager_id}
                        currentLabel={
                          emp.direct_manager_id ? managerMap.get(emp.direct_manager_id) : null
                        }
                        excludeId={emp.id}
                        options={employees ?? []}
                        onChange={(managerId) =>
                          updateManager.mutate({ employeeId: emp.id, managerId })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface ManagerPickerProps {
  currentId: string | null;
  currentLabel: string | null | undefined;
  excludeId: string;
  options: Array<{ id: string; full_name: string; email: string }>;
  onChange: (managerId: string | null) => void;
}

const ManagerPicker = ({ currentId, currentLabel, excludeId, options, onChange }: ManagerPickerProps) => {
  const [open, setOpen] = useState(false);
  const list = options.filter((o) => o.id !== excludeId);

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("flex-1 justify-between font-normal", !currentId && "text-muted-foreground")}
          >
            <span className="truncate">{currentLabel || "Sem gestor (fallback p/ depto)"}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar colaborador..." />
            <CommandList>
              <CommandEmpty>Nenhum colaborador.</CommandEmpty>
              <CommandGroup>
                {list.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`${o.full_name} ${o.email}`}
                    onSelect={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentId === o.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{o.full_name || "Sem nome"}</span>
                      <span className="text-xs text-muted-foreground">{o.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {currentId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onChange(null)}
          title="Remover gestor direto"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
